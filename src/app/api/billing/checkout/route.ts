/**
 * POST /api/billing/checkout
 *
 * Crea (o riusa) un Stripe Customer per l'host loggato e ritorna l'URL
 * della Checkout Session per il piano richiesto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe, PLAN_PRICES } from '@/lib/stripe/client';

const Schema = z.object({ plan: z.enum(['HOST', 'HOST_PLUS']) });

export async function POST(req: NextRequest) {
  const { user } = await validateRequest();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'bad_plan' }, { status: 400 });

  const priceId = PLAN_PRICES[parsed.data.plan];
  if (!priceId) {
    return NextResponse.json({ error: 'plan_not_configured' }, { status: 500 });
  }

  const host = await prisma.host.findUnique({ where: { id: user.id } });
  if (!host) return NextResponse.json({ error: 'host_not_found' }, { status: 404 });

  const s = stripe();

  let customerId = host.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await s.customers.create({
      email: host.email,
      name: host.fullName,
      metadata: { hostId: host.id },
    });
    customerId = customer.id;
    await prisma.host.update({
      where: { id: host.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { hostId: host.id, plan: parsed.data.plan },
    },
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?cancelled=1`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'checkout_session_failed' }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
