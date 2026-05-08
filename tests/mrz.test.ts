import { describe, it, expect } from 'vitest';
import {
  detectMrz,
  mrzCheckDigit,
  parseTd1,
  parseTd3,
} from '@/lib/ocr/mrz';

describe('mrzCheckDigit', () => {
  it('matches the ICAO 9303 example', () => {
    // Doc 9303 worked example: "L898902C<3" check digit on "L898902C" is 3.
    expect(mrzCheckDigit('L898902C')).toBe(3);
  });
  it('handles all-digit fields', () => {
    // 7*7 + 4*3 + 0*1 + 6*7 + 1*3 + 1*1 = 107 → 7
    expect(mrzCheckDigit('740611')).toBe(7);
  });
  it('returns -1 on invalid char', () => {
    expect(mrzCheckDigit('A!B')).toBe(-1);
  });
});

describe('parseTd3 (passport)', () => {
  // Synthetic but ICAO-conformant passport for testing
  const line1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
  // Composite check digit recomputed for this fixture: 6.
  const line2 = 'L898902C<3UTO7408122F1204159ZE184226B<<<<<16';

  it('parses the passport fields correctly', () => {
    const out = parseTd3(line1, line2);
    expect(out).not.toBeNull();
    expect(out?.documentType).toBe('P');
    expect(out?.surname).toBe('ERIKSSON');
    expect(out?.givenNames).toBe('ANNA MARIA');
    expect(out?.documentNumber).toBe('L898902C');
    expect(out?.nationality).toBe('UTO');
    expect(out?.birthDate).toBe('1974-08-12');
    expect(out?.sex).toBe('F');
    expect(out?.expirationDate).toBe('2012-04-15');
  });
  it('reports check-digit results', () => {
    const out = parseTd3(line1, line2);
    expect(out?.checks.documentNumber).toBe(true);
    expect(out?.checks.birthDate).toBe(true);
    expect(out?.checks.expirationDate).toBe(true);
  });
});

describe('detectMrz', () => {
  it('finds passport MRZ inside surrounding noise', () => {
    const text = `
      Some random OCR header
      P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
      L898902C<3UTO7408122F1204159ZE184226B<<<<<10
      Some footer text
    `;
    const out = detectMrz(text);
    expect(out).not.toBeNull();
    expect(out?.format).toBe('TD3');
    expect(out?.surname).toBe('ERIKSSON');
  });
  it('returns null when no MRZ present', () => {
    expect(detectMrz('just some normal text without any MRZ block')).toBeNull();
  });
});

describe('parseTd1 (ID card)', () => {
  // ICAO TD1 worked example (3 lines × 30 chars)
  const line1 = 'I<UTOD231458907<<<<<<<<<<<<<<<';
  const line2 = '7408122F1204159UTO<<<<<<<<<<<6';
  const line3 = 'ERIKSSON<<ANNA<MARIA<<<<<<<<<<';

  it('parses all three lines', () => {
    const out = parseTd1(line1, line2, line3);
    expect(out).not.toBeNull();
    expect(out?.format).toBe('TD1');
    expect(out?.surname).toBe('ERIKSSON');
    expect(out?.givenNames).toBe('ANNA MARIA');
    expect(out?.birthDate).toBe('1974-08-12');
  });
});
