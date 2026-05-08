/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler. Eventi gestiti:
 *   - checkout.session.completed
 *   - customer.subscription.created/updated → aggiorna piano e renewsAt
 *   - customer.subscription.deleted → torna a FREE
 *
 * La verifica della firma usa STRIPE_WEBHOOK_SECRET. Body raw, niente JSON parse.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe, planFromPriceId } from '@/lib/stripe/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid';
    return NextResponse.json({ error: `bad_signature: ${msg}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        await applySubscription(String(session.customer), String(session.subscription));
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await applySubscription(String(sub.customer), sub.id);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const host = await prisma.host.findUnique({ where: { stripeCustomerId: String(sub.customer) } });
      if (host) {
        await prisma.host.update({
          where: { id: host.id },
          data: { plan: 'FREE', stripeSubscriptionId: null, planRenewsAt: null },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function applySubscription(customerId: string, subscriptionId: string): Promise<void> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const plan = planFromPriceId(priceId);
  const host = await prisma.host.findUnique({ where: { stripeCustomerId: customerId } });
  if (!host) return;

  await prisma.host.update({
    where: { id: host.id },
    data: {
      plan,
      stripeSubscriptionId: subscriptionId,
      planRenewsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    },
  });
}
