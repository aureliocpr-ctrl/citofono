/**
 * GET /api/bookings/:id/alloggiati.txt
 *
 * Genera il file Alloggiati Web (formato a larghezza fissa, ISO-8859-1) per
 * la prenotazione. Solo l'host proprietario può scaricare.
 */

import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';
import { buildAlloggiatiFile, type AlloggiatiGuest } from '@/lib/alloggiati/export';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await validateRequest();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const booking = await prisma.booking.findFirst({
    where: { id, property: { hostId: user.id } },
    include: { guests: true, property: true },
  });
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const verifiedGuests = booking.guests.filter((g) => g.verified);
  if (verifiedGuests.length === 0) {
    return NextResponse.json({ error: 'no_verified_guests' }, { status: 400 });
  }

  const numNights = Math.max(
    1,
    Math.round(
      (booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const arrival = booking.checkInDate.toISOString().slice(0, 10);
  const isFamily = verifiedGuests.length > 1;

  const exportRows: AlloggiatiGuest[] = verifiedGuests.map((g, idx) => ({
    arrivalDate: arrival,
    numNights,
    surname: g.lastName ?? '',
    givenNames: g.firstName ?? '',
    sex: (g.sex ?? 'M') as 'M' | 'F' | 'X',
    birthDate: g.birthDate?.toISOString().slice(0, 10) ?? '',
    birthCountryCode3: g.birthCountry ?? 'ITA',
    citizenshipCode3: g.nationality ?? 'ITA',
    documentType:
      (g.docType as AlloggiatiGuest['documentType']) ?? 'ID_CARD',
    documentNumber: g.docNumber ?? '',
    documentIssuingCountryCode3: g.docIssuingCountry ?? undefined,
    role: !isFamily ? 'single' : idx === 0 ? 'family_head' : 'family_member',
  }));

  const file = buildAlloggiatiFile(exportRows);

  // Cache the generated CSV on the CheckIn record for traceability.
  await prisma.checkIn.update({
    where: { bookingId: booking.id },
    data: { alloggiatiCsv: file },
  });

  await audit({
    event: 'alloggiati.exported',
    hostId: user.id,
    bookingId: booking.id,
    details: { numGuests: verifiedGuests.length, format: 'txt' },
    ...ipAndUaFromHeaders(req.headers),
  });

  // ISO-8859-1 encoding required by the Italian Police portal
  const buf = Buffer.from(file, 'latin1');
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=ISO-8859-1',
      'Content-Disposition': `attachment; filename="alloggiati_${booking.id}.txt"`,
    },
  });
}
