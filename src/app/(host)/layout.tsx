import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { lucia, validateRequest } from '@/lib/auth';
import { audit } from '@/lib/audit';

async function logoutAction() {
  'use server';
  const { session, user } = await validateRequest();
  if (!session) return;
  await lucia.invalidateSession(session.id);
  const cookie = lucia.createBlankSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);
  if (user) await audit({ event: 'host.logout', hostId: user.id });
  redirect('/');
}

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const { user } = await validateRequest();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-post/5">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-post">●</span>
            Citofono
          </Link>
          <nav className="hidden gap-6 text-sm md:flex">
            <Link href="/dashboard" className="text-ink/70 hover:text-ink">Dashboard</Link>
            <Link href="/properties" className="text-ink/70 hover:text-ink">Appartamenti</Link>
            <Link href="/bookings" className="text-ink/70 hover:text-ink">Prenotazioni</Link>
            <Link href="/billing" className="text-ink/70 hover:text-ink">Abbonamento</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink/60 md:inline">{user.email}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-ink/70 hover:text-ink">Esci</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
