/**
 * Settings host:
 *   - cambio password (richiede password corrente)
 *   - credenziali Alloggiati Web (cifrate at rest in v0.5)
 *   - export GDPR (Art. 20 — portabilità) — link a /api/host/me/export
 *   - cancellazione account (Art. 17 — diritto all'oblio) — link a /api/host/me/delete
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { validateRequest, hashPassword, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';
import { enforceForAction, RL } from '@/lib/rateLimit';

const PasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
  confirmPassword: z.string().min(10).max(200),
});

const AlloggiatiSchema = z.object({
  alloggiatiUser: z.string().max(80).optional().or(z.literal('')),
});

async function changePassword(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const reqHeaders = await headers();
  const rl = enforceForAction(reqHeaders, 'change-password', RL.AUTH);
  if (!rl.allowed) {
    redirect(`/settings?error=ratelimit&retry=${rl.retryAfterSec}`);
  }
  const parsed = PasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/settings?error=invalid');
  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    redirect('/settings?error=mismatch');
  }
  const host = await prisma.host.findUnique({ where: { id: user.id } });
  if (!host) redirect('/login');
  const ok = await verifyPassword(host.hashedPassword, currentPassword);
  if (!ok) {
    redirect('/settings?error=wrongpwd');
  }
  const newHash = await hashPassword(newPassword);
  await prisma.host.update({ where: { id: user.id }, data: { hashedPassword: newHash } });
  await audit({ event: 'host.password_changed', hostId: user.id, ...ipAndUaFromHeaders(reqHeaders) });
  redirect('/settings?ok=password');
}

async function saveAlloggiati(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const parsed = AlloggiatiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/settings?error=invalid');
  await prisma.host.update({
    where: { id: user.id },
    data: { alloggiatiUser: parsed.data.alloggiatiUser || null },
  });
  await audit({ event: 'host.alloggiati_updated', hostId: user.id });
  revalidatePath('/settings');
  redirect('/settings?ok=alloggiati');
}

const errorMessages: Record<string, string> = {
  invalid: 'Controlla i dati.',
  mismatch: 'Le due password non coincidono.',
  wrongpwd: 'La password corrente è errata.',
  ratelimit: 'Troppi tentativi, riprova fra qualche minuto.',
};

const okMessages: Record<string, string> = {
  password: 'Password aggiornata.',
  alloggiati: 'Credenziali Alloggiati Web salvate.',
};

export default async function SettingsPage(props: {
  searchParams: Promise<{ error?: string; ok?: string; retry?: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const sp = await props.searchParams;
  const host = await prisma.host.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      fullName: true,
      plan: true,
      alloggiatiUser: true,
      alloggiatiHashed: true,
      createdAt: true,
    },
  });
  if (!host) redirect('/login');

  let errorMessage: string | null = null;
  if (sp.error === 'ratelimit' && sp.retry) {
    errorMessage = `Troppi tentativi. Riprova tra ${sp.retry} secondi.`;
  } else if (sp.error) {
    errorMessage = errorMessages[sp.error] ?? 'Errore.';
  }
  const okMessage = sp.ok ? okMessages[sp.ok] ?? null : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Impostazioni</h1>
        <p className="mt-1 text-ink/60">Account e configurazioni avanzate.</p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {okMessage && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {okMessage}
        </div>
      )}

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Profilo</h2>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/50">Email</dt>
            <dd className="mt-1 text-sm">{host.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/50">Nome</dt>
            <dd className="mt-1 text-sm">{host.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/50">Piano</dt>
            <dd className="mt-1 text-sm">{host.plan}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/50">Membro da</dt>
            <dd className="mt-1 text-sm">{host.createdAt.toLocaleDateString('it-IT')}</dd>
          </div>
        </dl>
      </section>

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Cambia password</h2>
        <form action={changePassword} className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="currentPassword" className="citofono-label">Password corrente</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="citofono-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="citofono-label">Nuova password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="citofono-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="citofono-label">Conferma nuova password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="citofono-input mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="citofono-btn-primary">Aggiorna password</button>
          </div>
        </form>
      </section>

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Alloggiati Web</h2>
        <p className="mt-1 text-sm text-ink/60">
          Salva qui il tuo username del portale Polizia di Stato come riferimento.
          La password NON viene memorizzata: per ora il caricamento della schedina
          è manuale (scarichi il file .txt e lo carichi sul portale). L'invio
          automatico sarà disponibile in una prossima versione.
        </p>
        <form action={saveAlloggiati} className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="alloggiatiUser" className="citofono-label">Username Alloggiati</label>
            <input
              id="alloggiatiUser"
              name="alloggiatiUser"
              type="text"
              defaultValue={host.alloggiatiUser ?? ''}
              autoComplete="off"
              className="citofono-input mt-1"
              placeholder="es. ABC123"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="citofono-btn-secondary">Salva username</button>
          </div>
        </form>
      </section>

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">I tuoi dati (GDPR)</h2>
        <p className="mt-1 text-sm text-ink/60">
          Hai il diritto di esportare e cancellare tutti i tuoi dati in qualsiasi momento.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/api/host/me/export" className="citofono-btn-secondary" download>
            Esporta i miei dati (Art. 20)
          </a>
          <Link
            href="/settings/delete-account"
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Cancella account (Art. 17)
          </Link>
        </div>
      </section>
    </div>
  );
}
