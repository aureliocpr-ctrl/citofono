import Link from 'next/link';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function DashboardPage() {
  const { user } = await validateRequest();
  if (!user) return null;

  const [propertyCount, bookings, recentCheckIns] = await Promise.all([
    prisma.property.count({ where: { hostId: user.id, archivedAt: null } }),
    prisma.booking.findMany({
      where: { property: { hostId: user.id } },
      orderBy: { checkInDate: 'asc' },
      take: 5,
      include: { property: true, checkIn: true, guests: true },
    }),
    prisma.checkIn.findMany({
      where: { booking: { property: { hostId: user.id } }, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      include: { booking: { include: { property: true, guests: true } } },
    }),
  ]);

  const upcoming = bookings.filter((b) => b.checkInDate >= new Date());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Ciao {user.fullName.split(' ')[0]}.</h1>
        <p className="mt-1 text-ink/60">Ecco lo stato dei tuoi affitti brevi.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Appartamenti" value={propertyCount} href="/properties" />
        <Stat label="Prenotazioni in arrivo" value={upcoming.length} href="/bookings" />
        <Stat label="Check-in completati" value={recentCheckIns.length} href="/bookings?status=completed" />
      </div>

      <section className="citofono-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Prossime prenotazioni</h2>
          <Link href="/bookings/new" className="citofono-btn-primary text-sm">+ Nuova prenotazione</Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="mt-4 divide-y divide-ink/10">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium">{b.property.name}</div>
                  <div className="text-sm text-ink/60">
                    {b.leadName} · {b.numGuests} ospiti · {fmtRange(b.checkInDate, b.checkOutDate)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckInBadge status={b.checkIn?.status ?? 'PENDING'} />
                  <Link href={`/bookings/${b.id}`} className="text-sm font-medium text-ink underline">
                    Apri
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {propertyCount === 0 && <FirstTimeBanner />}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="citofono-card block p-6 hover:bg-post/10">
      <div className="text-xs uppercase tracking-wider text-ink/50">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </Link>
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
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-md border border-dashed border-ink/20 bg-post/5 p-8 text-center">
      <p className="text-ink/70">Nessuna prenotazione in arrivo.</p>
      <Link href="/bookings/new" className="mt-3 inline-block text-sm font-medium underline">
        Crea la prima
      </Link>
    </div>
  );
}

function FirstTimeBanner() {
  return (
    <div className="rounded-lg border-2 border-ink bg-post p-6">
      <h3 className="font-display text-xl font-bold">Iniziamo dal tuo primo appartamento.</h3>
      <p className="mt-2 text-sm text-ink/70">
        Aggiungi indirizzo, orari e info casa. La guida diventa la knowledge base del concierge AI.
      </p>
      <Link href="/properties/new" className="citofono-btn-primary mt-4">
        Aggiungi appartamento
      </Link>
    </div>
  );
}

function fmtRange(a: Date, b: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  return `${fmt(a)} → ${fmt(b)}`;
}
