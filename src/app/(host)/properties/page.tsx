import Link from 'next/link';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PropertiesPage() {
  const { user } = await validateRequest();
  if (!user) return null;
  const properties = await prisma.property.findMany({
    where: { hostId: user.id, archivedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Appartamenti</h1>
        <Link href="/properties/new" className="citofono-btn-primary">+ Aggiungi appartamento</Link>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink/20 bg-white p-12 text-center">
          <p className="text-ink/70">Non hai ancora aggiunto appartamenti.</p>
          <Link href="/properties/new" className="mt-3 inline-block text-sm font-medium underline">
            Aggiungi il primo
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="citofono-card block p-6 hover:bg-post/5">
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="mt-1 text-sm text-ink/60">{p.address}, {p.city}</div>
              <div className="mt-4 flex items-center gap-4 text-xs text-ink/50">
                <span>Check-in {p.checkInTime}</span>
                <span>·</span>
                <span>{p._count.bookings} prenotazioni</span>
                {p.cin && (
                  <>
                    <span>·</span>
                    <span>CIN {p.cin}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
