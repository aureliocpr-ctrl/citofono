/**
 * POST /api/guest/[token]/confirm-data
 *
 * Dopo l'OCR, il guest può rivedere e correggere i campi prima di procedere
 * al selfie. Questa route accetta il dato finale e lo salva sul Guest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { loadGuestSession } from '@/lib/guestSession';

const Schema = z.object({
  guestId: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthPlace: z.string().max(80).optional(),
  birthCountry: z.string().length(3),
  nationality: z.string().length(3),
  sex: z.enum(['M', 'F', 'X']),
  documentType: z.enum(['PASSPORT', 'ID_CARD', 'DRIVING_LICENSE', 'RESIDENCE_PERMIT', 'OTHER']),
  documentNumber: z.string().min(1).max(40),
  documentIssuingCountry: z.string().length(3),
  documentExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const sess = await loadGuestSession(token);
  if (!sess) return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 404 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_data', issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  const guest = await prisma.guest.findFirst({
    where: { id: d.guestId, bookingId: sess.booking.id },
  });
  if (!guest) return NextResponse.json({ error: 'guest_not_found' }, { status: 404 });

  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      birthDate: new Date(d.birthDate),
      birthPlace: d.birthPlace,
      birthCountry: d.birthCountry,
      nationality: d.nationality,
      sex: d.sex,
      docType: d.documentType,
      docNumber: d.documentNumber,
      docIssuingCountry: d.documentIssuingCountry,
      docExpiresAt: d.documentExpiresAt ? new Date(d.documentExpiresAt) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
