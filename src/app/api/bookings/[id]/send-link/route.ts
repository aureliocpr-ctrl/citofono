/**
 * POST /api/bookings/:id/send-link
 *
 * Invia all'ospite (lead) il link di check-in via email.
 * Body opzionale: { lang: "it" | "en" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendGuestCheckInLink } from '@/lib/email';

const Schema = z.object({ lang: z.enum(['it', 'en']).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await validateRequest();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const booking = await prisma.booking.findFirst({
    where: { id, property: { hostId: user.id } },
    include: { property: true },
  });
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!booking.leadEmail) {
    return NextResponse.json({ error: 'no_lead_email' }, { status: 400 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  const lang = parsed.success ? parsed.data.lang : 'it';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const link = `${appUrl}/v/${booking.checkInToken}`;
  const result = await sendGuestCheckInLink({
    to: booking.leadEmail,
    toName: booking.leadName,
    link,
    propertyName: booking.property.name,
    lang,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'send_failed', message: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
