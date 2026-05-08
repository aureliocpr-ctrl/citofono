/**
 * POST /api/billing/portal
 *
 * Apre il Customer Portal di Stripe per gestione subscription, fatture,
 * metodo di pagamento, cancellazione.
 */

import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe/client';

export async function POST() {
  const { user } = await validateRequest();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const host = await prisma.host.findUnique({ where: { id: user.id } });
  if (!host?.stripeCustomerId) {
    return NextResponse.json({ error: 'no_customer' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe().billingPortal.sessions.create({
    customer: host.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
