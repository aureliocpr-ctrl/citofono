/**
 * POST /api/concierge/[token]
 *
 * Endpoint pubblico per gli ospiti — riceve un messaggio + cronologia, chiama
 * il concierge AI multilingua e ritorna la risposta. Rate-limit basico per
 * token: max 30 messaggi / ora.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { loadGuestSession } from '@/lib/guestSession';
import { conciergeAsk } from '@/lib/concierge';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';

const Schema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(10)
    .optional(),
  languageHint: z.string().max(8).optional(),
});

const RATE_LIMIT_PER_HOUR = 30;

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const sess = await loadGuestSession(token);
  if (!sess) return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 404 });

  // Rate limit per booking
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.auditLog.count({
    where: {
      bookingId: sess.booking.id,
      event: 'concierge.message',
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recent >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json({ error: 'rate_limited', retryAfterSec: 3600 }, { status: 429 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { propertyId: sess.property.id },
    orderBy: { updatedAt: 'desc' },
  });

  try {
    const result = await conciergeAsk({
      context: { property: sess.property, chunks },
      history: parsed.data.history ?? [],
      message: parsed.data.message,
      languageHint: parsed.data.languageHint,
    });

    await audit({
      event: 'concierge.message',
      bookingId: sess.booking.id,
      details: {
        language: result.language,
        usedChunks: result.usedChunks,
        usage: result.usage,
      },
      ...ipAndUaFromHeaders(req.headers),
    });

    return NextResponse.json({ reply: result.reply, language: result.language });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'concierge_failed', message: msg }, { status: 500 });
  }
}
