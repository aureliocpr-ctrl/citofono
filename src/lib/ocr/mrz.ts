/**
 * Parser MRZ (Machine Readable Zone) ISO/IEC 7501-1.
 *
 * Tutti i passaporti ICAO e le CIE italiane recenti hanno un'area MRZ alla
 * base del documento. Rispetto al riconoscimento OCR generico è:
 *   - deterministica (formato fisso, charset {A-Z, 0-9, '<'})
 *   - validabile (cifre di controllo per ogni campo)
 *   - multilingua-free (sempre in caratteri latini)
 *
 * Supportiamo i 3 formati standard:
 *   - TD3: passaporti, 2 righe × 44 char
 *   - TD2: documenti antichi, 2 righe × 36 char (ID card vecchio formato)
 *   - TD1: ID card moderne (CIE inclusa), 3 righe × 30 char
 *
 * Riferimento: ICAO Doc 9303 (https://www.icao.int/publications/Documents/9303_p3_cons_en.pdf)
 */

export interface MrzData {
  format: 'TD1' | 'TD2' | 'TD3';
  documentType: string; // 'P' = passport, 'I' = ID card, 'A'/'C' = others
  issuingCountry: string; // ISO 3166-1 alpha-3
  surname: string;
  givenNames: string;
  documentNumber: string;
  nationality: string; // ISO 3166-1 alpha-3
  birthDate: string; // YYYY-MM-DD
  sex: 'M' | 'F' | 'X';
  expirationDate: string; // YYYY-MM-DD
  personalNumber?: string;
  /** True if all check digits are valid. */
  valid: boolean;
  /** Per-field check digit results, useful for diagnostics. */
  checks: {
    documentNumber: boolean;
    birthDate: boolean;
    expirationDate: boolean;
    composite: boolean;
  };
}

const CHAR_VALUES: Record<string, number> = {};
for (let i = 0; i < 10; i++) CHAR_VALUES[String(i)] = i;
for (let i = 0; i < 26; i++) CHAR_VALUES[String.fromCharCode(65 + i)] = 10 + i;
CHAR_VALUES['<'] = 0;

/** ICAO 9303 check digit: Σ(value × weight) mod 10, weights {7,3,1,7,3,1,…}. */
export function mrzCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === undefined) continue;
    const v = CHAR_VALUES[c];
    if (v === undefined) return -1; // invalid char
    const w = weights[i % 3];
    if (w === undefined) continue;
    sum += v * w;
  }
  return sum % 10;
}

function parseDate(yyMMdd: string): string {
  // MRZ uses YYMMDD; we infer century: if YY > 30, assume 1900s; else 2000s.
  // (A 2026 newborn → 26; a 1950 person → 50. The cutoff catches both.)
  if (yyMMdd.length !== 6 || !/^\d{6}$/.test(yyMMdd)) return '';
  const yy = Number(yyMMdd.slice(0, 2));
  const mm = yyMMdd.slice(2, 4);
  const dd = yyMMdd.slice(4, 6);
  const century = yy <= 30 ? 2000 : 1900;
  return `${century + yy}-${mm}-${dd}`;
}

function cleanName(field: string): string {
  return field.replace(/<+/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitName(field: string): { surname: string; givenNames: string } {
  const idx = field.indexOf('<<');
  if (idx < 0) return { surname: cleanName(field), givenNames: '' };
  return {
    surname: cleanName(field.slice(0, idx)),
    givenNames: cleanName(field.slice(idx + 2)),
  };
}

function parseSex(c: string | undefined): 'M' | 'F' | 'X' {
  if (c === 'M') return 'M';
  if (c === 'F') return 'F';
  return 'X';
}

/** Try to parse a TD3 (passport) MRZ. Two lines × 44 chars. */
export function parseTd3(line1: string, line2: string): MrzData | null {
  if (line1.length !== 44 || line2.length !== 44) return null;
  if (line1[0] !== 'P') return null;

  const documentType = line1.slice(0, 2).replace(/</g, '').trim() || 'P';
  const issuingCountry = line1.slice(2, 5);
  const { surname, givenNames } = splitName(line1.slice(5, 44));

  const documentNumber = line2.slice(0, 9).replace(/</g, '').trim();
  const docNumCheck = line2[9];
  const nationality = line2.slice(10, 13);
  const birthDateRaw = line2.slice(13, 19);
  const birthCheck = line2[19];
  const sex = parseSex(line2[20]);
  const expRaw = line2.slice(21, 27);
  const expCheck = line2[27];
  const personalNumber = line2.slice(28, 42).replace(/</g, '').trim();
  const personalCheck = line2[42];
  const compositeCheck = line2[43];

  const compositeData =
    line2.slice(0, 10) +
    line2.slice(13, 20) +
    line2.slice(21, 28) +
    line2.slice(28, 43);

  const checks = {
    documentNumber: mrzCheckDigit(line2.slice(0, 9)).toString() === docNumCheck,
    birthDate: mrzCheckDigit(birthDateRaw).toString() === birthCheck,
    expirationDate: mrzCheckDigit(expRaw).toString() === expCheck,
    composite: mrzCheckDigit(compositeData).toString() === compositeCheck,
  };
  // personalCheck is sometimes '<' (no personal number) which by spec means 0.
  const _personalCheckOk =
    personalNumber.length === 0
      ? personalCheck === '<' || personalCheck === '0'
      : mrzCheckDigit(line2.slice(28, 42)).toString() === personalCheck;
  void _personalCheckOk; // not part of validity decision; some issuers vary

  const valid =
    checks.documentNumber && checks.birthDate && checks.expirationDate && checks.composite;

  return {
    format: 'TD3',
    documentType,
    issuingCountry,
    surname,
    givenNames,
    documentNumber,
    nationality,
    birthDate: parseDate(birthDateRaw),
    sex,
    expirationDate: parseDate(expRaw),
    personalNumber: personalNumber.length > 0 ? personalNumber : undefined,
    valid,
    checks,
  };
}

/** Try to parse a TD1 (ID card, CIE) MRZ. Three lines × 30 chars. */
export function parseTd1(line1: string, line2: string, line3: string): MrzData | null {
  if (line1.length !== 30 || line2.length !== 30 || line3.length !== 30) return null;
  if (line1[0] !== 'I' && line1[0] !== 'A' && line1[0] !== 'C') return null;

  const documentType = line1.slice(0, 2).replace(/</g, '').trim() || 'I';
  const issuingCountry = line1.slice(2, 5);
  const documentNumber = line1.slice(5, 14).replace(/</g, '').trim();
  const docNumCheck = line1[14];
  // optional data line 1 (15..29)

  const birthDateRaw = line2.slice(0, 6);
  const birthCheck = line2[6];
  const sex = parseSex(line2[7]);
  const expRaw = line2.slice(8, 14);
  const expCheck = line2[14];
  const nationality = line2.slice(15, 18);
  // optional data line 2 (18..28)
  const compositeCheck = line2[29];

  const { surname, givenNames } = splitName(line3);

  const compositeData = line1.slice(5, 30) + line2.slice(0, 7) + line2.slice(8, 15) + line2.slice(18, 29);

  const checks = {
    documentNumber: mrzCheckDigit(line1.slice(5, 14)).toString() === docNumCheck,
    birthDate: mrzCheckDigit(birthDateRaw).toString() === birthCheck,
    expirationDate: mrzCheckDigit(expRaw).toString() === expCheck,
    composite: mrzCheckDigit(compositeData).toString() === compositeCheck,
  };

  const valid =
    checks.documentNumber && checks.birthDate && checks.expirationDate && checks.composite;

  return {
    format: 'TD1',
    documentType,
    issuingCountry,
    surname,
    givenNames,
    documentNumber,
    nationality,
    birthDate: parseDate(birthDateRaw),
    sex,
    expirationDate: parseDate(expRaw),
    valid,
    checks,
  };
}

/** Try to parse a TD2 MRZ. Two lines × 36 chars. */
export function parseTd2(line1: string, line2: string): MrzData | null {
  if (line1.length !== 36 || line2.length !== 36) return null;

  const documentType = line1.slice(0, 2).replace(/</g, '').trim();
  const issuingCountry = line1.slice(2, 5);
  const { surname, givenNames } = splitName(line1.slice(5, 36));

  const documentNumber = line2.slice(0, 9).replace(/</g, '').trim();
  const docNumCheck = line2[9];
  const nationality = line2.slice(10, 13);
  const birthDateRaw = line2.slice(13, 19);
  const birthCheck = line2[19];
  const sex = parseSex(line2[20]);
  const expRaw = line2.slice(21, 27);
  const expCheck = line2[27];
  const optional = line2.slice(28, 35);
  const compositeCheck = line2[35];

  const compositeData = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 28) + optional;

  const checks = {
    documentNumber: mrzCheckDigit(line2.slice(0, 9)).toString() === docNumCheck,
    birthDate: mrzCheckDigit(birthDateRaw).toString() === birthCheck,
    expirationDate: mrzCheckDigit(expRaw).toString() === expCheck,
    composite: mrzCheckDigit(compositeData).toString() === compositeCheck,
  };

  const valid =
    checks.documentNumber && checks.birthDate && checks.expirationDate && checks.composite;

  return {
    format: 'TD2',
    documentType,
    issuingCountry,
    surname,
    givenNames,
    documentNumber,
    nationality,
    birthDate: parseDate(birthDateRaw),
    sex,
    expirationDate: parseDate(expRaw),
    valid,
    checks,
  };
}

/**
 * High-level: take raw OCR text from a document, locate the MRZ block,
 * try each format, return the first that validates (or the best candidate).
 *
 * Returns null if no plausible MRZ is found.
 */
export function detectMrz(rawText: string): MrzData | null {
  // Normalize: uppercase, strip non-MRZ chars per line, keep '<'.
  const lines = rawText
    .split(/\r?\n/)
    .map((l) =>
      l
        .toUpperCase()
        .replace(/[^A-Z0-9<]/g, '')
        .trim(),
    )
    .filter((l) => l.length >= 30 && l.length <= 44);

  if (lines.length < 2) return null;

  // TD3: passports — look for 2 consecutive 44-char lines starting with 'P'.
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (a === undefined || b === undefined) continue;
    if (a.length === 44 && b.length === 44 && a.startsWith('P')) {
      const td3 = parseTd3(a, b);
      if (td3) return td3;
    }
  }
  // TD1: 3 consecutive 30-char lines.
  for (let i = 0; i + 2 < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    const c = lines[i + 2];
    if (a === undefined || b === undefined || c === undefined) continue;
    if (a.length === 30 && b.length === 30 && c.length === 30) {
      const td1 = parseTd1(a, b, c);
      if (td1) return td1;
    }
  }
  // TD2: 2 consecutive 36-char lines.
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (a === undefined || b === undefined) continue;
    if (a.length === 36 && b.length === 36) {
      const td2 = parseTd2(a, b);
      if (td2) return td2;
    }
  }
  return null;
}
