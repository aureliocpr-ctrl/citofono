/**
 * Pagina di conferma cancellazione account.
 *
 * GDPR Art. 17 — Diritto all'oblio. La cancellazione è IRREVERSIBILE e
 * propaga su tutto: properties, bookings, guests, documents (anche su S3),
 * face embeddings, audit log con hostId.
 *
 * Caveat: gli eventi audit `host.account_deleted` vengono creati DOPO la
 * cancellazione con `hostId = null` per lasciare traccia del fatto che
 * l'account è stato cancellato (necessario per dimostrare la conformità).
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { headers, cookies } from 'next/headers';
import { lucia, validateRequest, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';
import { deleteObject } from '@/lib/storage';
import { enforceForAction, RL } from '@/lib/rateLimit';
import { stripe } from '@/lib/stripe/client';

const Schema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.string(),
});

async function deleteAccountAction(formData: FormData) {
  'use server';
  const { user, session } = await validateRequest();
  if (!user || !session) redirect('/login');
  const reqHeaders = await headers();
  const rl = enforceForAction(reqHeaders, 'delete-account', RL.AUTH);
  if (!rl.allowed) {
    redirect(`/settings/delete-account?error=ratelimit&retry=${rl.retryAfterSec}`);
  }
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/settings/delete-account?error=invalid');
  const { password, confirm } = parsed.data;
  if (confirm !== 'CANCELLA IL MIO ACCOUNT') {
    redirect('/settings/delete-account?error=confirm');
  }
  const host = await prisma.host.findUnique({ where: { id: user.id } });
  if (!host) redirect('/login');
  const ok = await verifyPassword(host.hashedPassword, password);
  if (!ok) redirect('/settings/delete-account?error=wrongpwd');

  const ipUa = ipAndUaFromHeaders(reqHeaders);

  // 1. Cancella la subscription Stripe se attiva (best-effort).
  if (host.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      await stripe().subscriptions.cancel(host.stripeSubscriptionId);
    } catch {
      // Se Stripe fallisce non blocchiamo la cancellazione GDPR;
      // il webhook customer.deleted gestirà eventualmente lo stato.
    }
  }

  // 2. Raccogli tutte le chiavi S3 (documenti) di tutti i guest dell'host.
  const docs = await prisma.document.findMany({
    where: { guest: { booking: { property: { hostId: user.id } } } },
    select: { s3Key: true },
  });
  // 3. Cancella i file S3 (best-effort: se uno fallisce, andiamo avanti — il
  //    cleanup notturno GDPR riproverà).
  await Promise.allSettled(docs.map((d) => deleteObject(d.s3Key)));

  // 4. Cancella in cascata via DB. Lo schema ha `onDelete: Cascade` su
  //    Host -> Property -> Booking -> Guest -> Document/FaceEmbedding/CheckIn.
  //    Gli AuditLog hanno hostId opzionale, li mettiamo a null prima per
  //    preservare la traccia.
  await prisma.$transaction([
    prisma.auditLog.updateMany({
      where: { hostId: user.id },
      data: { hostId: null },
    }),
    prisma.host.delete({ where: { id: user.id } }),
  ]);

  // 5. Audit anonimizzato (hostId null perché l'account non esiste più).
  await audit({
    event: 'host.account_deleted',
    details: { deletedHostId: user.id, email: host.email },
    ...ipUa,
  });

  // 6. Invalida la sessione e cancella il cookie.
  await lucia.invalidateSession(session.id).catch(() => {});
  const blank = lucia.createBlankSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(blank.name, blank.value, blank.attributes);

  redirect('/?deleted=1');
}

const errorMessages: Record<string, string> = {
  invalid: 'Controlla i dati.',
  wrongpwd: 'Password errata.',
  confirm: 'La frase di conferma non corrisponde.',
  ratelimit: 'Troppi tentativi. Riprova fra qualche minuto.',
};

export default async function DeleteAccountPage(props: {
  searchParams: Promise<{ error?: string; retry?: string }>;
}) {
  await validateRequest();
  const sp = await props.searchParams;
  let errorMessage = sp.error ? errorMessages[sp.error] ?? 'Errore.' : null;
  if (sp.error === 'ratelimit' && sp.retry) {
    errorMessage = `Troppi tentativi. Riprova tra ${sp.retry} secondi.`;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-ink/60 hover:text-ink">← Impostazioni</Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-red-800">Cancella account</h1>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        <h2 className="font-display text-lg font-bold">Cosa succede</h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>Vengono cancellati tutti i tuoi appartamenti, prenotazioni e knowledge base.</li>
          <li>Vengono cancellati i documenti d'identità, i selfie e gli embedding biometrici di tutti gli ospiti.</li>
          <li>Gli audit log vengono anonimizzati ma restano per obblighi GDPR (durata 5 anni).</li>
          <li>L'abbonamento Stripe viene mantenuto attivo fino a fine periodo (cancella prima da <Link href="/billing" className="underline">Abbonamento</Link>).</li>
          <li><strong>Operazione irreversibile.</strong> Non possiamo ripristinare i dati.</li>
        </ul>
        <p className="mt-3">
          Prima di procedere, considera di esportare i tuoi dati con il bottone "Esporta i miei dati" nelle Impostazioni.
        </p>
      </section>

      <form action={deleteAccountAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="citofono-label">Password attuale</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="citofono-input mt-1"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="citofono-label">
            Per confermare scrivi <code>CANCELLA IL MIO ACCOUNT</code>
          </label>
          <input
            id="confirm"
            name="confirm"
            required
            autoComplete="off"
            className="citofono-input mt-1"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Cancella definitivamente
          </button>
          <Link href="/settings" className="rounded-md border border-ink/20 px-4 py-2 text-sm font-semibold">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
