import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { CopyButton } from '@/components/CopyButton';
import { SendLinkButton } from './SendLinkButton';
import { lookupComune } from '@/lib/alloggiati/comuni';

async function cancelBooking(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const id = formData.get('bookingId');
  const confirm = formData.get('confirm');
  if (typeof id !== 'string') redirect('/bookings');
  if (confirm !== 'ANNULLA') {
    redirect(`/bookings/${id}?error=confirm`);
  }
  const booking = await prisma.booking.findFirst({
    where: { id, property: { hostId: user.id } },
  });
  if (!booking) redirect('/bookings');
  await prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  await audit({ event: 'booking.cancelled', hostId: user.id, bookingId: id });
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${id}`);
  redirect('/bookings?ok=cancelled');
}

async function resetCheckIn(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const id = formData.get('bookingId');
  if (typeof id !== 'string') redirect('/bookings');
  const booking = await prisma.booking.findFirst({
    where: { id, property: { hostId: user.id } },
    include: { guests: true },
  });
  if (!booking) redirect('/bookings');
  // Resetta lo stato di verifica di tutti gli ospiti e cancella eventuali
  // FaceEmbedding precedenti (privacy: l'ospite ricomincia da zero, niente
  // dati biometrici residui).
  await prisma.faceEmbedding.deleteMany({
    where: { guest: { bookingId: id } },
  });
  await prisma.guest.updateMany({
    where: { bookingId: id },
    data: {
      verified: false,
      verifiedAt: null,
      matchScore: null,
      livenessPassed: false,
      flaggedForReview: false,
      reviewReason: null,
    },
  });
  await prisma.checkIn.upsert({
    where: { bookingId: id },
    update: { status: 'IN_PROGRESS', completedAt: null },
    create: { bookingId: id, status: 'IN_PROGRESS' },
  });
  await audit({ event: 'checkin.reset', hostId: user.id, bookingId: id });
  revalidatePath(`/bookings/${id}`);
  redirect(`/bookings/${id}?ok=reset`);
}

export default async function BookingDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) return null;
  const { id } = await props.params;
  const sp = await props.searchParams;
  const booking = await prisma.booking.findFirst({
    where: { id, property: { hostId: user.id } },
    include: { property: true, checkIn: true, guests: true },
  });
  if (!booking) notFound();

  const checkInUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/v/${booking.checkInToken}`;
  const allVerified = booking.guests.length > 0 && booking.guests.every((g) => g.verified);
  const cancelled = booking.status === 'CANCELLED';
  const hasAnyVerification = booking.guests.some(
    (g) => g.verified || g.livenessPassed || g.flaggedForReview,
  );

  // Pre-flight Alloggiati: per ospiti italiani senza comune nel codice catastale
  // l'host dovrà correggere il file a mano. Lo segnaliamo PRIMA del download.
  const alloggiatiWarnings: Array<{ guestName: string; reason: string }> = [];
  if (allVerified) {
    for (const g of booking.guests) {
      const isItalian = (g.birthCountry ?? '').toUpperCase() === 'ITA';
      if (!isItalian) continue;
      const found = lookupComune(g.birthPlace);
      if (!found) {
        alloggiatiWarnings.push({
          guestName: `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim() || 'Ospite',
          reason: g.birthPlace
            ? `comune di nascita "${g.birthPlace}" non in tabella codici catastali`
            : `comune di nascita non rilevato dal documento`,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bookings" className="text-sm text-ink/60 hover:text-ink">← Prenotazioni</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{booking.property.name}</h1>
        <p className="mt-1 text-ink/60">
          {booking.leadName} · {booking.numGuests} ospiti · {fmtRange(booking.checkInDate, booking.checkOutDate)}
        </p>
        {cancelled && (
          <p className="mt-2 inline-block rounded bg-red-100 px-2 py-1 text-xs text-red-900">
            Prenotazione annullata
          </p>
        )}
      </div>

      {sp.ok === 'reset' && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          Check-in azzerato. L'ospite può rifare la verifica con il link.
        </div>
      )}
      {sp.error === 'confirm' && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          Per annullare digita esattamente <code>ANNULLA</code>.
        </div>
      )}

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Link check-in per l'ospite</h2>
        <p className="mt-1 text-sm text-ink/60">
          Invia questo link al cliente. Lo apre dal telefono e completa la verifica in 90 secondi.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <code className="block flex-1 truncate rounded-md bg-ink/5 px-3 py-2 text-xs">{checkInUrl}</code>
          <CopyButton text={checkInUrl} />
        </div>
        <div className="mt-4">
          <SendLinkButton bookingId={booking.id} hasEmail={!!booking.leadEmail} />
        </div>
      </section>

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Ospiti verificati</h2>
        {booking.guests.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">
            Ancora nessun ospite ha completato il check-in.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10">
            {booking.guests.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">
                    {g.firstName ?? '—'} {g.lastName ?? ''}
                  </div>
                  <div className="text-xs text-ink/50">
                    {g.docType ?? '—'} {g.docNumber ?? ''} · {g.nationality ?? '—'}
                  </div>
                </div>
                <div>
                  {g.verified ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">verificato</span>
                  ) : g.flaggedForReview ? (
                    <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-medium text-yellow-900">da rivedere</span>
                  ) : (
                    <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-medium">in corso</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {allVerified && (
        <section className="citofono-card border-2 border-ink p-6">
          <h2 className="font-display text-xl font-bold">Schedina Alloggiati Web</h2>
          <p className="mt-1 text-sm text-ink/60">
            Tutti gli ospiti sono verificati. Scarica il file e caricalo sul portale della Polizia.
          </p>
          {alloggiatiWarnings.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Attenzione — il file potrebbe richiedere modifiche manuali:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {alloggiatiWarnings.map((w, i) => (
                  <li key={i}>
                    <strong>{w.guestName}</strong>: {w.reason}.
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Il portale Alloggiati Web richiede il codice catastale del comune di nascita
                (4 lettere/numeri, es. <code>H501</code> per Roma) nelle colonne 106-114 del
                file .txt. Se il comune non è in tabella, apri il file con un editor di testo,
                cerca la riga dell'ospite e inserisci il codice. Lista codici:{' '}
                <a
                  href="https://www.istat.it/it/archivio/codici-dei-comuni-italiani"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  ISTAT
                </a>.
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`/api/bookings/${booking.id}/alloggiati.txt`}
              className="citofono-btn-primary"
              download
            >
              Scarica .txt (ufficiale)
            </a>
            <a
              href={`/api/bookings/${booking.id}/alloggiati.csv`}
              className="citofono-btn-secondary"
              download
            >
              Scarica .csv (anteprima)
            </a>
          </div>
        </section>
      )}

      {hasAnyVerification && !cancelled && (
        <section className="citofono-card p-6">
          <h2 className="font-display text-xl font-bold">Riprova check-in</h2>
          <p className="mt-1 text-sm text-ink/60">
            Se la verifica facciale è andata male, azzera lo stato di tutti gli ospiti.
            I dati biometrici precedenti vengono cancellati e l'ospite può rifare il flusso
            con lo stesso link.
          </p>
          <form action={resetCheckIn} className="mt-4">
            <input type="hidden" name="bookingId" value={booking.id} />
            <button type="submit" className="citofono-btn-secondary">
              Azzera verifiche
            </button>
          </form>
        </section>
      )}

      {!cancelled && (
        <section className="rounded-lg border border-red-200 bg-red-50/50 p-6">
          <h2 className="font-display text-xl font-bold text-red-800">Annulla prenotazione</h2>
          <p className="mt-1 text-sm text-red-900/80">
            La prenotazione viene marcata come annullata. I dati ospiti restano per
            obblighi GDPR e fiscali, ma la schedina Alloggiati Web non viene generata.
          </p>
          <form action={cancelBooking} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="bookingId" value={booking.id} />
            <div className="flex-1">
              <label htmlFor="confirm" className="text-xs uppercase tracking-wider text-red-900/80">
                Per confermare scrivi <code>ANNULLA</code>
              </label>
              <input
                id="confirm"
                name="confirm"
                required
                className="citofono-input mt-1 border-red-300"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Annulla
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function fmtRange(a: Date, b: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(a)} → ${fmt(b)}`;
}
