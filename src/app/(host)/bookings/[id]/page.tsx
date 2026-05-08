import Link from 'next/link';
import { notFound } from 'next/navigation';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CopyButton } from '@/components/CopyButton';

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await validateRequest();
  if (!user) return null;
  const { id } = await props.params;
  const booking = await prisma.booking.findFirst({
    where: { id, property: { hostId: user.id } },
    include: { property: true, checkIn: true, guests: true },
  });
  if (!booking) notFound();

  const checkInUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/v/${booking.checkInToken}`;
  const allVerified = booking.guests.length > 0 && booking.guests.every((g) => g.verified);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bookings" className="text-sm text-ink/60 hover:text-ink">← Prenotazioni</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{booking.property.name}</h1>
        <p className="mt-1 text-ink/60">
          {booking.leadName} · {booking.numGuests} ospiti · {fmtRange(booking.checkInDate, booking.checkOutDate)}
        </p>
      </div>

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Link check-in per l'ospite</h2>
        <p className="mt-1 text-sm text-ink/60">
          Invia questo link al cliente. Lo apre dal telefono e completa la verifica in 90 secondi.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <code className="block flex-1 truncate rounded-md bg-ink/5 px-3 py-2 text-xs">{checkInUrl}</code>
          <CopyButton text={checkInUrl} />
        </div>
        {booking.leadEmail && (
          <p className="mt-2 text-xs text-ink/50">
            Manuale per ora — l'invio automatico via email/WhatsApp arriva in v0.2.
          </p>
        )}
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
    </div>
  );
}

function fmtRange(a: Date, b: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(a)} → ${fmt(b)}`;
}
