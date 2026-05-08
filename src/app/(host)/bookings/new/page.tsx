import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

const BookingSchema = z.object({
  propertyId: z.string().min(1),
  leadName: z.string().min(2).max(120),
  leadEmail: z.string().email().optional().or(z.literal('')),
  leadPhone: z.string().max(40).optional().or(z.literal('')),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numGuests: z.coerce.number().int().min(1).max(20),
  externalRef: z.string().max(80).optional().or(z.literal('')),
});

async function createBookingAction(formData: FormData) {
  'use server';
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  const parsed = BookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/bookings/new?error=invalid');

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, hostId: user.id },
  });
  if (!property) redirect('/bookings/new?error=property');

  const tokenExp = new Date(parsed.data.checkOutDate);
  tokenExp.setDate(tokenExp.getDate() + 1);

  const booking = await prisma.booking.create({
    data: {
      propertyId: parsed.data.propertyId,
      leadName: parsed.data.leadName,
      leadEmail: parsed.data.leadEmail || null,
      leadPhone: parsed.data.leadPhone || null,
      checkInDate: new Date(parsed.data.checkInDate),
      checkOutDate: new Date(parsed.data.checkOutDate),
      numGuests: parsed.data.numGuests,
      externalRef: parsed.data.externalRef || null,
      checkInTokenExp: tokenExp,
      checkIn: { create: {} },
    },
  });
  redirect(`/bookings/${booking.id}`);
}

export default async function NewBookingPage() {
  const { user } = await validateRequest();
  if (!user) return null;
  const properties = await prisma.property.findMany({
    where: { hostId: user.id, archivedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  if (properties.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">Nuova prenotazione</h1>
        <div className="rounded-md border border-dashed border-ink/20 bg-white p-8 text-center">
          <p className="text-ink/70">Devi prima aggiungere almeno un appartamento.</p>
          <Link href="/properties/new" className="mt-3 inline-block text-sm font-medium underline">
            Aggiungi appartamento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bookings" className="text-sm text-ink/60 hover:text-ink">← Prenotazioni</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">Nuova prenotazione</h1>
      </div>
      <form action={createBookingAction} className="citofono-card max-w-2xl space-y-5 p-6">
        <div>
          <label htmlFor="propertyId" className="citofono-label">Appartamento</label>
          <select id="propertyId" name="propertyId" required className="citofono-input mt-1">
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="leadName" className="citofono-label">Nome di chi prenota</label>
          <input id="leadName" name="leadName" required className="citofono-input mt-1" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="leadEmail" className="citofono-label">Email</label>
            <input id="leadEmail" name="leadEmail" type="email" className="citofono-input mt-1" />
          </div>
          <div>
            <label htmlFor="leadPhone" className="citofono-label">Telefono / WhatsApp</label>
            <input id="leadPhone" name="leadPhone" className="citofono-input mt-1" placeholder="+39..." />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="checkInDate" className="citofono-label">Check-in</label>
            <input id="checkInDate" name="checkInDate" type="date" required className="citofono-input mt-1" />
          </div>
          <div>
            <label htmlFor="checkOutDate" className="citofono-label">Check-out</label>
            <input id="checkOutDate" name="checkOutDate" type="date" required className="citofono-input mt-1" />
          </div>
          <div>
            <label htmlFor="numGuests" className="citofono-label">N° ospiti</label>
            <input id="numGuests" name="numGuests" type="number" min={1} max={20} defaultValue={2} required className="citofono-input mt-1" />
          </div>
        </div>

        <div>
          <label htmlFor="externalRef" className="citofono-label">Codice esterno (opzionale)</label>
          <input id="externalRef" name="externalRef" className="citofono-input mt-1" placeholder="HMABC123 (Airbnb, Booking, ...)" />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="citofono-btn-primary">Crea prenotazione</button>
          <Link href="/bookings" className="citofono-btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  );
}
