/**
 * Pipeline di estrazione dati da un'immagine di documento d'identità.
 *
 * Strategia a 2 livelli:
 *   1. MRZ deterministico (passaporti, CIE recente). Accuratezza ~99%.
 *   2. OCR generico (Tesseract.js) con regex tagliata su CIE cartacea
 *      e CdI legacy. Confidenza dichiarata, fallback "rivedi i dati".
 *
 * Output normalizzato: ExtractedDocument compatibile con i campi richiesti
 * dal modello Alloggiati Web della Polizia di Stato.
 */

import type { DocumentType } from '@prisma/client';
import { detectMrz, type MrzData } from './mrz';
import { italianCountryName } from './countries';

export interface ExtractedDocument {
  /** Confidence 0..1: how much we trust the extraction. */
  confidence: number;
  /** Source of the extraction. */
  source: 'mrz' | 'tesseract';
  /** Raw OCR text (for audit / manual review). */
  rawText: string;
  /** MRZ block if found. */
  mrz?: MrzData;
  // ── Normalized fields ──
  documentType?: DocumentType;
  documentNumber?: string;
  issuingCountry?: string; // ISO 3
  issuingCountryItalian?: string;
  surname?: string;
  givenNames?: string;
  birthDate?: string; // YYYY-MM-DD
  birthPlace?: string;
  nationality?: string; // ISO 3
  nationalityItalian?: string;
  sex?: 'M' | 'F' | 'X';
  expirationDate?: string;
  /** Fields the user should review (low-confidence). */
  needsReview: string[];
}

/**
 * Map MRZ document type code (1-2 letter) to our DocumentType enum.
 */
function docTypeFromMrz(code: string): DocumentType {
  const c = code.toUpperCase();
  if (c.startsWith('P')) return 'PASSPORT';
  if (c.startsWith('I') || c.startsWith('A') || c.startsWith('C')) return 'ID_CARD';
  return 'OTHER';
}

/**
 * Build an ExtractedDocument from a successfully-validated MRZ.
 * Confidence is high (0.95) when all check digits match.
 */
export function fromMrz(mrz: MrzData, rawText: string): ExtractedDocument {
  const confidence = mrz.valid ? 0.95 : 0.6;
  const needsReview: string[] = [];
  if (!mrz.checks.documentNumber) needsReview.push('documentNumber');
  if (!mrz.checks.birthDate) needsReview.push('birthDate');
  if (!mrz.checks.expirationDate) needsReview.push('expirationDate');
  if (!mrz.checks.composite) needsReview.push('composite');

  return {
    confidence,
    source: 'mrz',
    rawText,
    mrz,
    documentType: docTypeFromMrz(mrz.documentType),
    documentNumber: mrz.documentNumber,
    issuingCountry: mrz.issuingCountry,
    issuingCountryItalian: italianCountryName(mrz.issuingCountry),
    surname: mrz.surname,
    givenNames: mrz.givenNames,
    birthDate: mrz.birthDate,
    nationality: mrz.nationality,
    nationalityItalian: italianCountryName(mrz.nationality),
    sex: mrz.sex,
    expirationDate: mrz.expirationDate,
    needsReview,
  };
}

/**
 * Tesseract fallback: pull a few likely fields out of free text using regex
 * heuristics tuned for Italian "Carta d'Identità" cartacea (legacy 1995-2018).
 *
 * Confidence here is much lower (~0.55); we always flag fields for review.
 */
export function fromTesseractCdI(rawText: string): ExtractedDocument {
  const text = rawText.replace(/\s+/g, ' ').toUpperCase();
  const needsReview: string[] = [];

  // Stop words: encountering one of these terminates a name capture.
  const STOPS = new Set([
    'NATO', 'NATA', 'IL', 'DI', 'DEL', 'DELLA', 'DI/IN', 'A',
    'COGNOME', 'NOME', 'SURNAME', 'NAME', 'LUOGO', 'COMUNE',
    'DATA', 'NASCITA', 'CITTADINANZA', 'SESSO', 'DOCUMENTO', 'CARTA',
    'N', 'NR', 'NUM', 'NUMERO', 'RILASCIO', 'SCADENZA',
  ]);

  function findAfter(label: RegExp, maxTokens = 2): string | undefined {
    const m = text.match(label);
    if (!m) return undefined;
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 60);
    const cleaned = after.replace(/^[\s:.\-]+/, '');
    const tokens = cleaned.split(/\s+/);
    const out: string[] = [];
    for (const t of tokens) {
      if (!/^[A-Z'À-ſ]+$/.test(t)) break;
      if (STOPS.has(t)) break;
      out.push(t);
      if (out.length >= maxTokens) break;
    }
    return out.length > 0 ? out.join(' ') : undefined;
  }

  const surname = findAfter(/\bCOGNOME\b|\bSURNAME\b/);
  const givenNames = findAfter(/\bNOME\b|\bGIVEN\b/);
  const birthDateMatch = text.match(/NAT[OA]\s+IL[^0-9]*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/);
  const birthPlaceMatch = text.match(/NAT[OA]\s+A[^A-Z]*([A-Z'À-ſ]{2,}(?:\s[A-Z'À-ſ]{2,}){0,3})/);
  const docNumMatch = text.match(/(?:CART(?:A)?|N[°.]?\s*DOCUMENTO|NUMERO)\s*[:.]?\s*([A-Z]{0,2}\s?\d{6,9})/);

  let birthDate: string | undefined;
  if (birthDateMatch?.[1]) {
    const parts = birthDateMatch[1].split(/[\/.\-]/).map((p) => p.trim());
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d && m && y) {
        const yyyy = y.length === 2 ? (Number(y) > 30 ? '19' + y : '20' + y) : y;
        birthDate = `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }

  if (!surname) needsReview.push('surname');
  if (!givenNames) needsReview.push('givenNames');
  if (!birthDate) needsReview.push('birthDate');
  if (!docNumMatch) needsReview.push('documentNumber');

  return {
    confidence: 0.55,
    source: 'tesseract',
    rawText,
    documentType: 'ID_CARD',
    documentNumber: docNumMatch?.[1]?.replace(/\s+/g, ''),
    issuingCountry: 'ITA',
    issuingCountryItalian: 'ITALIA',
    surname,
    givenNames,
    birthDate,
    birthPlace: birthPlaceMatch?.[1],
    nationality: 'ITA',
    nationalityItalian: 'ITALIA',
    needsReview,
  };
}

/**
 * Top-level extractor: try MRZ first, fallback to Tesseract heuristics.
 * Caller passes the raw OCR text (already produced by Tesseract or another
 * provider) so this function stays pure and unit-testable.
 */
export function extractFromOcrText(rawText: string): ExtractedDocument {
  const mrz = detectMrz(rawText);
  if (mrz) return fromMrz(mrz, rawText);
  return fromTesseractCdI(rawText);
}
