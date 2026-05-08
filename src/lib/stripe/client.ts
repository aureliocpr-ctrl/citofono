/**
 * Stripe SDK singleton + helper per la mappatura piano ↔ priceId.
 *
 * I priceId sono configurati via env (uno per piano). Manteniamo qui la
 * tabella di mapping in modo che il resto del codice usi solo HostPlan.
 */

import Stripe from 'stripe';
import type { HostPlan } from '@prisma/client';

let cached: Stripe | null = null;
export function stripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY missing');
    cached = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  }
  return cached;
}

export const PLAN_PRICES: Record<Exclude<HostPlan, 'FREE' | 'PRO'>, string | undefined> = {
  HOST: process.env.STRIPE_PRICE_HOST,
  HOST_PLUS: process.env.STRIPE_PRICE_HOST_PLUS,
};

export const PLAN_LIMITS: Record<HostPlan, { maxProperties: number; checkInsPerMonth: number | 'unlimited' }> = {
  FREE: { maxProperties: 1, checkInsPerMonth: 3 },
  HOST: { maxProperties: 1, checkInsPerMonth: 'unlimited' },
  HOST_PLUS: { maxProperties: 5, checkInsPerMonth: 'unlimited' },
  PRO: { maxProperties: 999, checkInsPerMonth: 'unlimited' },
};

export function planFromPriceId(priceId: string | null | undefined): HostPlan {
  if (!priceId) return 'FREE';
  if (priceId === process.env.STRIPE_PRICE_HOST) return 'HOST';
  if (priceId === process.env.STRIPE_PRICE_HOST_PLUS) return 'HOST_PLUS';
  return 'FREE';
}

export interface PlanInfo {
  plan: HostPlan;
  label: string;
  priceMonthly: number;
  description: string;
}

export const PLAN_INFO: Record<HostPlan, PlanInfo> = {
  FREE: {
    plan: 'FREE',
    label: 'Free',
    priceMonthly: 0,
    description: '1 appartamento, 3 check-in al mese',
  },
  HOST: {
    plan: 'HOST',
    label: 'Host',
    priceMonthly: 19,
    description: '1 appartamento, check-in illimitati',
  },
  HOST_PLUS: {
    plan: 'HOST_PLUS',
    label: 'Host+',
    priceMonthly: 49,
    description: 'Fino a 5 appartamenti, check-in illimitati',
  },
  PRO: {
    plan: 'PRO',
    label: 'Pro',
    priceMonthly: 9,
    description: 'Property manager: 9€/unità sopra le 5',
  },
};
