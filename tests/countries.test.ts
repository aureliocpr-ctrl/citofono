import { describe, it, expect } from 'vitest';
import {
  lookupByCode3,
  lookupByCode2,
  italianCountryName,
  alloggiatiCountryCode,
  ALL_COUNTRIES,
} from '@/lib/ocr/countries';

describe('countries lookup', () => {
  it('finds Italy', () => {
    expect(lookupByCode3('ITA')?.italianName).toBe('ITALIA');
    expect(lookupByCode2('IT')?.code3).toBe('ITA');
  });
  it('returns the italian name for a foreign country', () => {
    expect(italianCountryName('DEU')).toBe('GERMANIA');
    expect(italianCountryName('FRA')).toBe('FRANCIA');
  });
  it('returns the ISO code if unknown', () => {
    expect(italianCountryName('XYZ')).toBe('XYZ');
  });
  it('exposes a populated catalogue', () => {
    expect(ALL_COUNTRIES.length).toBeGreaterThan(50);
  });
  it('returns the alloggiati code or a fallback', () => {
    expect(alloggiatiCountryCode('ITA')).toBe('100000100');
    expect(alloggiatiCountryCode('XYZ')).toBe('100000999');
  });
});
