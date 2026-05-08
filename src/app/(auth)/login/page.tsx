import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { lucia, verifyPassword, dummyHash } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';
import { enforceForAction, RL } from '@/lib/rateLimit';

const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(200),
});

async function loginAction(formData: FormData) {
  'use server';
  const reqHeaders = await headers();
  const rl = enforceForAction(reqHeaders, 'login', RL.AUTH);
  if (!rl.allowed) {
    redirect(`/login?error=ratelimit&retry=${rl.retryAfterSec}`);
  }
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect('/login?error=invalid');
  }
  const { email, password } = parsed.data;
  const host = await prisma.host.findUnique({ where: { email } });
  // Always run a verifyPassword to keep timing roughly constant.
  // DUMMY_HASH is a real argon2id hash of 'unguessable-placeholder' generated
  // once at module init in lib/auth.
  const referenceHash = host?.hashedPassword ?? (await dummyHash());
  const ok = await verifyPassword(referenceHash, password);
  if (!host || !ok) {
    redirect('/login?error=credentials');
  }
  const session = await lucia.createSession(host.id, {});
  const cookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);

  await audit({ event: 'host.login', hostId: host.id, ...ipAndUaFromHeaders(reqHeaders) });
  redirect('/dashboard');
}

const errorMessages: Record<string, string> = {
  invalid: 'Email o password non valide.',
  credentials: 'Credenziali errate.',
  ratelimit: 'Troppi tentativi. Riprova tra qualche minuto.',
};

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; retry?: string }>;
}) {
  const sp = await props.searchParams;
  let errorMessage = sp.error ? errorMessages[sp.error] ?? 'Errore.' : null;
  if (sp.error === 'ratelimit' && sp.retry) {
    errorMessage = `Troppi tentativi. Riprova tra ${sp.retry} secondi.`;
  }

  return (
    <main className="min-h-screen bg-post/10">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-post">●</span>
          Citofono
        </Link>
        <h1 className="font-display text-3xl font-bold">Bentornato.</h1>

        {errorMessage && (
          <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form action={loginAction} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="citofono-label">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="citofono-input mt-1" />
          </div>
          <div>
            <label htmlFor="password" className="citofono-label">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="citofono-input mt-1" />
          </div>
          <button type="submit" className="citofono-btn-primary w-full">Accedi</button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/70">
          Non hai un account? <Link href="/signup" className="font-medium underline">Registrati</Link>
        </p>
      </div>
    </main>
  );
}
