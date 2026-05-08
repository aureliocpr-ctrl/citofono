import Link from 'next/link';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function BookingsPage() {
  const { user } = await validateRequest();
  if (!user) return null;
  const bookings = await prisma.booking.findMany({
    where: { property: { hostId: user.id } },
    orderBy: { checkInDate: 'desc' },
    take: 50,
    include: { property: true, checkIn: true, guests: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Prenotazioni</h1>
        <Link href="/bookings/new" className="citofono-btn-primary">+ Nuova prenotazione</Link>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink/20 bg-white p-12 text-center">
          <p className="text-ink/70">Nessuna prenotazione ancora.</p>
        </div>
      ) : (
        <div className="citofono-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-post/10 text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-4 py-3">Appartamento</th>
                <th className="px-4 py-3">Ospite</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{b.property.name}</td>
                  <td className="px-4 py-3">
                    <div>{b.leadName}</div>
                    <div className="text-xs text-ink/50">{b.numGuests} ospiti</div>
                  </td>
                  <td className="px-4 py-3">{fmtRange(b.checkInDate, b.checkOutDate)}</td>
                  <td className="px-4 py-3">
                    <CheckInBadge status={b.checkIn?.status ?? 'PENDING'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/bookings/${b.id}`} className="text-sm font-medium underline">Apri</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CheckInBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'da fare', cls: 'bg-ink/10 text-ink' },
    IN_PROGRESS: { label: 'in corso', cls: 'bg-post text-ink' },
    AWAITING_REVIEW: { label: 'verifica', cls: 'bg-yellow-200 text-yellow-900' },
    COMPLETED: { label: 'completato', cls: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'rigettato', cls: 'bg-red-100 text-red-800' },
  };
  const m = map[status] ?? { label: status, cls: 'bg-ink/10 text-ink' };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function fmtRange(a: Date, b: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(a)} → ${fmt(b)}`;
}
