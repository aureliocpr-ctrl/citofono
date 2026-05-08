import { describe, it, expect } from 'vitest';
import {
  computeSoggiornoTax,
  lookupComune,
  ALL_COMUNI,
} from '@/lib/tax/soggiorno';

describe('lookupComune', () => {
  it('finds Roma case-insensitively', () => {
    expect(lookupComune('roma')?.province).toBe('RM');
    expect(lookupComune('ROMA')?.province).toBe('RM');
    expect(lookupComune('  roma  ')?.province).toBe('RM');
  });
  it('returns undefined for unknown comune', () => {
    expect(lookupComune('XYZ123NONEXIST')).toBeUndefined();
  });
});

describe('computeSoggiornoTax', () => {
  it('caps nights at the comune limit', () => {
    // Roma: 6€/persona/notte, max 10 notti
    const out = computeSoggiornoTax({ comune: 'Roma', numGuests: 2, numNights: 14 });
    expect(out.effectiveNights).toBe(10);
    expect(out.total).toBe(6 * 2 * 10);
    expect(out.source).toBe('table');
  });

  it('applies the override when provided', () => {
    const out = computeSoggiornoTax({
      comune: 'XYZ',
      numGuests: 3,
      numNights: 4,
      override: { perPersonNight: 2.5, maxNights: 7 },
    });
    expect(out.perPersonNight).toBe(2.5);
    expect(out.total).toBe(2.5 * 3 * 4);
    expect(out.source).toBe('override');
  });

  it('returns 0 for unknown comune without override', () => {
    const out = computeSoggiornoTax({ comune: 'XYZ', numGuests: 2, numNights: 3 });
    expect(out.total).toBe(0);
    expect(out.source).toBe('unknown');
  });

  it('exempts under-age guests', () => {
    // Roma: exemptUnder 10
    const out = computeSoggiornoTax({
      comune: 'Roma',
      numGuests: 4,
      numNights: 3,
      guestAges: [35, 33, 8, 5], // 2 adults pay
    });
    expect(out.exemptedGuests).toBe(2);
    expect(out.total).toBe(6 * 2 * 3);
  });

  it('rounds to 2 decimals', () => {
    const out = computeSoggiornoTax({
      comune: 'XYZ',
      numGuests: 1,
      numNights: 3,
      override: { perPersonNight: 1.333, maxNights: 999 },
    });
    expect(Number.isInteger(out.total * 100)).toBe(true);
  });
});

describe('catalogue', () => {
  it('includes the major Italian tourist cities', () => {
    const codes = ALL_COMUNI.map((c) => c.comune);
    expect(codes).toContain('ROMA');
    expect(codes).toContain('VENEZIA');
    expect(codes).toContain('FIRENZE');
    expect(codes).toContain('NAPOLI');
    expect(ALL_COMUNI.length).toBeGreaterThan(40);
  });
});
