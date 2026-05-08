import { describe, it, expect, beforeEach } from 'vitest';
import { planFromPriceId, PLAN_INFO, PLAN_LIMITS } from '@/lib/stripe/client';

describe('planFromPriceId', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_HOST = 'price_host_test';
    process.env.STRIPE_PRICE_HOST_PLUS = 'price_host_plus_test';
  });

  it('returns FREE for null/undefined', () => {
    expect(planFromPriceId(null)).toBe('FREE');
    expect(planFromPriceId(undefined)).toBe('FREE');
  });
  it('maps the configured price ids to plans', () => {
    expect(planFromPriceId('price_host_test')).toBe('HOST');
    expect(planFromPriceId('price_host_plus_test')).toBe('HOST_PLUS');
  });
  it('falls back to FREE for unknown price ids', () => {
    expect(planFromPriceId('price_unknown')).toBe('FREE');
  });
});

describe('PLAN_INFO + PLAN_LIMITS', () => {
  it('has consistent labels and prices for each plan', () => {
    expect(PLAN_INFO.HOST.priceMonthly).toBe(19);
    expect(PLAN_INFO.HOST_PLUS.priceMonthly).toBe(49);
    expect(PLAN_INFO.FREE.priceMonthly).toBe(0);
  });
  it('FREE limits to 3 check-ins', () => {
    expect(PLAN_LIMITS.FREE.checkInsPerMonth).toBe(3);
    expect(PLAN_LIMITS.HOST.checkInsPerMonth).toBe('unlimited');
  });
  it('property cap grows with plan', () => {
    expect(PLAN_LIMITS.HOST.maxProperties).toBeLessThan(PLAN_LIMITS.HOST_PLUS.maxProperties);
  });
});
