import { describe, it, expect } from 'vitest';
import {
  buildAlloggiatiLine,
  buildAlloggiatiFile,
  buildAlloggiatiCsv,
  type AlloggiatiGuest,
} from '@/lib/alloggiati/export';

const sampleGuest: AlloggiatiGuest = {
  arrivalDate: '2026-06-12',
  numNights: 3,
  surname: 'Müller',
  givenNames: 'Hans Peter',
  sex: 'M',
  birthDate: '1980-04-15',
  birthCountryCode3: 'DEU',
  citizenshipCode3: 'DEU',
  documentType: 'PASSPORT',
  documentNumber: 'C01X12345',
  documentIssuingCountryCode3: 'DEU',
  role: 'single',
};

describe('buildAlloggiatiLine', () => {
  it('produces a line of exactly 168 characters', () => {
    const line = buildAlloggiatiLine(sampleGuest);
    expect(line.length).toBe(168);
  });
  it('starts with role code 16 for single guest', () => {
    expect(buildAlloggiatiLine(sampleGuest).slice(0, 2)).toBe('16');
  });
  it('uses role code 17 for family head', () => {
    expect(
      buildAlloggiatiLine({ ...sampleGuest, role: 'family_head' }).slice(0, 2),
    ).toBe('17');
  });
  it('formats the arrival date as DD/MM/YYYY at columns 3-12', () => {
    const line = buildAlloggiatiLine(sampleGuest);
    expect(line.slice(2, 12)).toBe('12/06/2026');
  });
  it('zero-pads the night count', () => {
    expect(buildAlloggiatiLine(sampleGuest).slice(12, 14)).toBe('03');
  });
  it('strips diacritics from the surname', () => {
    const line = buildAlloggiatiLine(sampleGuest);
    expect(line.slice(14, 64).trim()).toBe('MULLER');
  });
  it('uppercases and concatenates given names', () => {
    expect(buildAlloggiatiLine(sampleGuest).slice(64, 94).trim()).toBe('HANS PETER');
  });
  it('uses the document type code IDENT for ID cards', () => {
    const line = buildAlloggiatiLine({ ...sampleGuest, documentType: 'ID_CARD' });
    expect(line.slice(132, 137).trim()).toBe('IDENT');
  });
  it('uses PASOR for passports', () => {
    expect(buildAlloggiatiLine(sampleGuest).slice(132, 137).trim()).toBe('PASOR');
  });
});

describe('buildAlloggiatiFile', () => {
  it('separates rows with CRLF and ends with CRLF', () => {
    const file = buildAlloggiatiFile([sampleGuest, sampleGuest]);
    expect(file.endsWith('\r\n')).toBe(true);
    expect(file.split('\r\n').filter((l) => l.length > 0)).toHaveLength(2);
  });
});

describe('buildAlloggiatiCsv', () => {
  it('produces a header row and one row per guest', () => {
    const csv = buildAlloggiatiCsv([sampleGuest]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('cognome');
    expect(lines).toHaveLength(2);
  });
  it('replaces ISO country codes with italian names', () => {
    const csv = buildAlloggiatiCsv([sampleGuest]);
    expect(csv).toContain('GERMANIA');
  });
});
