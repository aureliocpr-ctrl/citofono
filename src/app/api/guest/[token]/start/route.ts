/**
 * POST /api/guest/[token]/start
 *
 * Inizializza il flusso check-in: crea (se non esiste) il record Guest
 * placeholder e marca il booking come IN_PROGRESS. Idempotente: chiamarla due
 * volte non duplica record. Restituisce guestId per i successivi step.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadGuestSession } from '@/lib/guestSession';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const sess = await loadGuestSession(token);
  if (!sess) return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 404 });

  const existing = await prisma.guest.findFirst({
    where: { bookingId: sess.booking.id, verified: false },
    orderBy: { createdAt: 'asc' },
  });

  let guest = existing;
  if (!guest) {
    guest = await prisma.guest.create({
      data: { bookingId: sess.booking.id },
    });
    await prisma.checkIn.upsert({
      where: { bookingId: sess.booking.id },
      update: { status: 'IN_PROGRESS', startedAt: new Date() },
      create: { bookingId: sess.booking.id, status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  await audit({
    event: 'guest.checkin.start',
    bookingId: sess.booking.id,
    guestId: guest.id,
    ...ipAndUaFromHeaders(req.headers),
  });

  return NextResponse.json({
    guestId: guest.id,
    propertyName: sess.property.name,
    leadName: sess.booking.leadName,
    numGuests: sess.booking.numGuests,
    checkInDate: sess.booking.checkInDate,
    checkOutDate: sess.booking.checkOutDate,
    propertyCheckInTime: sess.property.checkInTime,
  });
}
