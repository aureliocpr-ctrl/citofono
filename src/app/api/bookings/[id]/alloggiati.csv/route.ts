/**
 * GET /api/bookings/:id/alloggiati.csv
 *
 * CSV "leggibile" della schedina, utile per l'host che vuole verificare i
 * dati a colpo d'occhio prima di caricarli sul portale.
 */

import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildAlloggiatiCsv, type AlloggiatiGuest } from '@/lib/alloggiati/export';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await validateRequest();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const booking = await prisma.booking.findFirst({
    where: { id, property: { hostId: user.id } },
    include: { guests: true, property: true },
  });
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const verifiedGuests = booking.guests.filter((g) => g.verified);
  const numNights = Math.max(
    1,
    Math.round(
      (booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const arrival = booking.checkInDate.toISOString().slice(0, 10);
  const isFamily = verifiedGuests.length > 1;
  const rows: AlloggiatiGuest[] = verifiedGuests.map((g, idx) => ({
    arrivalDate: arrival,
    numNights,
    surname: g.lastName ?? '',
    givenNames: g.firstName ?? '',
    sex: (g.sex ?? 'M') as 'M' | 'F' | 'X',
    birthDate: g.birthDate?.toISOString().slice(0, 10) ?? '',
    birthPlace: g.birthPlace ?? undefined,
    birthCountryCode3: g.birthCountry ?? 'ITA',
    citizenshipCode3: g.nationality ?? 'ITA',
    documentType: (g.docType as AlloggiatiGuest['documentType']) ?? 'ID_CARD',
    documentNumber: g.docNumber ?? '',
    documentIssuingCountryCode3: g.docIssuingCountry ?? undefined,
    role: !isFamily ? 'single' : idx === 0 ? 'family_head' : 'family_member',
  }));

  const csv = buildAlloggiatiCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="alloggiati_${booking.id}.csv"`,
    },
  });
}
