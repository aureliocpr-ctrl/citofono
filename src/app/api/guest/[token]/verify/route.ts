/**
 * POST /api/guest/[token]/verify
 *
 * Riceve i due embedding (selfie + foto del documento), già calcolati nel
 * browser via face-api.js, più il flag livenessPassed. Confronta i vettori
 * e decide se la verifica passa.
 *
 * Body JSON:
 *   {
 *     guestId: string,
 *     selfieEmbedding: number[]   // 128 float
 *     docEmbedding: number[]      // 128 float
 *     livenessPassed: boolean,
 *     livenessChallenge: string
 *   }
 *
 * Risposta:
 *   { verdict: 'match' | 'review' | 'reject', similarity: number, verified: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { loadGuestSession } from '@/lib/guestSession';
import { matchEmbeddings, encodeEmbedding } from '@/lib/face/match';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';

const Schema = z.object({
  guestId: z.string().min(1),
  selfieEmbedding: z.array(z.number()).length(128),
  docEmbedding: z.array(z.number()).length(128),
  livenessPassed: z.boolean(),
  livenessChallenge: z.string().min(1),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const sess = await loadGuestSession(token);
  if (!sess) return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 404 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const { guestId, selfieEmbedding, docEmbedding, livenessPassed } = parsed.data;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: sess.booking.id },
  });
  if (!guest) return NextResponse.json({ error: 'guest_not_found' }, { status: 404 });

  if (!livenessPassed) {
    await audit({
      event: 'liveness.failed',
      bookingId: sess.booking.id,
      guestId: guest.id,
      ...ipAndUaFromHeaders(req.headers),
    });
    return NextResponse.json({ verdict: 'reject', verified: false, reason: 'liveness_failed' });
  }
  await audit({
    event: 'liveness.success',
    bookingId: sess.booking.id,
    guestId: guest.id,
    ...ipAndUaFromHeaders(req.headers),
  });

  const selfie = new Float32Array(selfieEmbedding);
  const doc = new Float32Array(docEmbedding);
  const result = matchEmbeddings(selfie, doc);

  // Save the selfie embedding for the duration of the stay (cancellato dopo).
  const scheduledDeleteAt = new Date(sess.booking.checkOutDate);
  scheduledDeleteAt.setDate(scheduledDeleteAt.getDate() + 7);

  await prisma.faceEmbedding.upsert({
    where: { guestId: guest.id },
    update: {
      embedding: encodeEmbedding(selfie),
      scheduledDeleteAt,
    },
    create: {
      guestId: guest.id,
      embedding: encodeEmbedding(selfie),
      scheduledDeleteAt,
    },
  });

  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      verified: result.verdict === 'match',
      verifiedAt: result.verdict === 'match' ? new Date() : null,
      matchScore: result.similarity,
      livenessPassed: true,
      flaggedForReview: result.verdict === 'review',
      reviewReason: result.reason ?? null,
    },
  });

  await audit({
    event:
      result.verdict === 'match'
        ? 'facematch.success'
        : result.verdict === 'review'
          ? 'facematch.review_required'
          : 'facematch.failed',
    bookingId: sess.booking.id,
    guestId: guest.id,
    details: { similarity: result.similarity, distance: result.distance },
    ...ipAndUaFromHeaders(req.headers),
  });

  // If all guests verified, mark check-in as completed.
  if (result.verdict === 'match') {
    const remaining = await prisma.guest.count({
      where: { bookingId: sess.booking.id, verified: false },
    });
    if (remaining === 0) {
      await prisma.checkIn.update({
        where: { bookingId: sess.booking.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await audit({
        event: 'guest.verified',
        bookingId: sess.booking.id,
        guestId: guest.id,
        ...ipAndUaFromHeaders(req.headers),
      });
    }
  } else if (result.verdict === 'review') {
    await prisma.checkIn.update({
      where: { bookingId: sess.booking.id },
      data: { status: 'AWAITING_REVIEW' },
    });
  }

  return NextResponse.json({
    verdict: result.verdict,
    similarity: Number(result.similarity.toFixed(3)),
    verified: result.verdict === 'match',
  });
}
