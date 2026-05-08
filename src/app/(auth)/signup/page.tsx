import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { lucia, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';
import { cookies, headers } from 'next/headers';

const SignupSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(10).max(200),
  acceptTerms: z.string().optional(),
});

async function signupAction(formData: FormData) {
  'use server';

  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect('/signup?error=invalid');
  }
  const { fullName, email, password, acceptTerms } = parsed.data;
  if (!acceptTerms) {
    redirect('/signup?error=terms');
  }
  const existing = await prisma.host.findUnique({ where: { email } });
  if (existing) {
    redirect('/signup?error=duplicate');
  }
  const hashedPassword = await hashPassword(password);
  const host = await prisma.host.create({
    data: {
      email,
      hashedPassword,
      fullName,
      acceptedTermsAt: new Date(),
      acceptedDpiaAt: new Date(),
    },
  });
  const session = await lucia.createSession(host.id, {});
  const cookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);

  const reqHeaders = await headers();
  await audit({
    event: 'host.signup',
    hostId: host.id,
    ...ipAndUaFromHeaders(reqHeaders),
  });

  redirect('/dashboard');
}

const errorMessages: Record<string, string> = {
  invalid: 'Controlla i dati inseriti.',
  terms: 'Devi accettare i termini per continuare.',
  duplicate: 'Esiste già un account con questa email.',
};

export default async function SignupPage(props: { searchParams: Promise<{ error?: string }> }) {
  const sp = await props.searchParams;
  const errorMessage = sp.error ? errorMessages[sp.error] ?? 'Errore.' : null;

  return (
    <main className="min-h-screen bg-post/10">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-post">●</span>
          Citofono
        </Link>
        <h1 className="font-display text-3xl font-bold">Crea il tuo account.</h1>
        <p className="mt-2 text-sm text-ink/70">3 check-in al mese gratis. Nessuna carta richiesta.</p>

        {errorMessage && (
          <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form action={signupAction} className="mt-8 space-y-5">
          <div>
            <label htmlFor="fullName" className="citofono-label">Nome e cognome</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              className="citofono-input mt-1"
              placeholder="Mario Rossi"
            />
          </div>
          <div>
            <label htmlFor="email" className="citofono-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="citofono-input mt-1"
              placeholder="tu@esempio.it"
            />
          </div>
          <div>
            <label htmlFor="password" className="citofono-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={10}
              className="citofono-input mt-1"
              placeholder="Almeno 10 caratteri"
            />
          </div>
          <div className="flex items-start gap-2">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-ink/20"
            />
            <label htmlFor="acceptTerms" className="text-sm text-ink/70">
              Accetto i <Link href="/terms" className="underline">Termini</Link>,
              la <Link href="/privacy" className="underline">Privacy Policy</Link> e
              la <Link href="/dpia" className="underline">DPIA</Link> per il trattamento di dati biometrici limitato alla verifica dell'identità.
            </label>
          </div>
          <button type="submit" className="citofono-btn-primary w-full">
            Crea account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/70">
          Hai già un account? <Link href="/login" className="font-medium underline">Accedi</Link>
        </p>
      </div>
    </main>
  );
}
