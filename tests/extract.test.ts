import { describe, it, expect } from 'vitest';
import { extractFromOcrText, fromMrz, fromTesseractCdI } from '@/lib/ocr/extract';
import { detectMrz } from '@/lib/ocr/mrz';

const validPassport = `
P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C<3UTO7408122F1204159ZE184226B<<<<<16
`;

describe('extractFromOcrText', () => {
  it('uses the MRZ path when a passport block is present', () => {
    const out = extractFromOcrText(validPassport);
    expect(out.source).toBe('mrz');
    expect(out.confidence).toBeGreaterThanOrEqual(0.9);
    expect(out.surname).toBe('ERIKSSON');
    expect(out.documentType).toBe('PASSPORT');
  });

  it('falls back to tesseract heuristics when no MRZ is present', () => {
    const fakeCdI = `
      REPUBBLICA ITALIANA
      CARTA D'IDENTITA
      COGNOME: ROSSI
      NOME: MARIO
      NATO IL: 12/03/1985
      NATO A: ROMA
      N. DOCUMENTO: AT1234567
    `;
    const out = extractFromOcrText(fakeCdI);
    expect(out.source).toBe('tesseract');
    expect(out.confidence).toBeLessThan(0.8);
    expect(out.surname).toBe('ROSSI');
    expect(out.givenNames).toBe('MARIO');
    expect(out.birthDate).toBe('1985-03-12');
  });
});

describe('fromMrz', () => {
  it('flags fields whose check digits failed', () => {
    const mrz = detectMrz(validPassport)!;
    // Tamper with the data to trigger a check-digit failure
    const corrupted = { ...mrz, checks: { ...mrz.checks, documentNumber: false } };
    const out = fromMrz(corrupted, validPassport);
    expect(out.needsReview).toContain('documentNumber');
  });
});

describe('fromTesseractCdI', () => {
  it('flags missing fields for review', () => {
    const out = fromTesseractCdI('REPUBBLICA ITALIANA');
    expect(out.needsReview.length).toBeGreaterThan(0);
  });
});
