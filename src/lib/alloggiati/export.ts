/**
 * Generatore del file di "Schedine Alloggiati" per il portale
 * alloggiatiweb.poliziadistato.it.
 *
 * Formato standard: file di testo a larghezza fissa, una riga per ospite,
 * encoding ISO-8859-1 (Latin-1). Larghezza riga 168 caratteri.
 *
 * Spec ufficiale (riferimento Polizia di Stato):
 *   col 1   (1 char)   Tipo alloggiato
 *                       16 = ospite singolo
 *                       17 = capofamiglia
 *                       18 = familiare
 *                       19 = capogruppo
 *                       20 = membro gruppo
 *                       19/20 si usano per gruppi viaggio organizzati
 *   col 2-9 (8 char)   Data arrivo: GG/MM/AAAA → senza separatori GGMMAAAA?
 *                       NO — il portale richiede GG/MM/AAAA (con slash)
 *                       Quindi 10 char totali; controlla manuale.
 *   col 10-11 (2 char) Numero giorni permanenza
 *   col 12-61 (50 char) Cognome
 *   col 62-91 (30 char) Nome
 *   col 92  (1 char)   Sesso (M/F)
 *   col 93-100 (10 char) Data nascita GG/MM/AAAA
 *   col 103-111 (9 char) Codice comune nascita (vedi tabella comuni IT)
 *   col 112-120 (9 char) Codice stato nascita (es. 100000100 = ITALIA)
 *   col 121-129 (9 char) Codice cittadinanza
 *   col 130-134 (5 char) Tipo documento (vedi tabella documenti)
 *                        IDENT = carta identità
 *                        PASOR = passaporto ordinario
 *                        ...
 *   col 135-154 (20 char) Numero documento
 *   col 155-163 (9 char) Codice luogo rilascio documento
 *
 * NOTA: il portale Alloggiati Web ha cambiato il formato negli anni.
 * Il formato attuale (verificato 2024) usa effettivamente record a
 * larghezza fissa con encoding Latin-1. Generiamo questo. La struttura
 * sotto è derivata dalla documentazione pubblica del portale.
 *
 * Per MVP produciamo:
 *   - file .txt a larghezza fissa (formato ufficiale)
 *   - file .csv leggibile (per controllo umano)
 */

import {
  alloggiatiCountryCode,
  italianCountryName,
  type CountryInfo,
  lookupByCode3,
} from '../ocr/countries';

export interface AlloggiatiGuest {
  arrivalDate: string; // YYYY-MM-DD
  numNights: number;
  surname: string;
  givenNames: string;
  sex: 'M' | 'F' | 'X';
  birthDate: string; // YYYY-MM-DD
  birthPlace?: string; // descrizione testuale (per la tabella comuni: TBD MVP)
  birthCountryCode3: string; // ISO 3
  citizenshipCode3: string; // ISO 3
  documentType: 'PASSPORT' | 'ID_CARD' | 'DRIVING_LICENSE' | 'RESIDENCE_PERMIT' | 'OTHER';
  documentNumber: string;
  documentIssuingCountryCode3?: string; // ISO 3
  /** Se è il primo del nucleo, indicato esplicitamente; altrimenti single. */
  role: 'single' | 'family_head' | 'family_member' | 'group_head' | 'group_member';
}

const ALLOGGIATI_DOC_TYPES: Record<AlloggiatiGuest['documentType'], string> = {
  PASSPORT: 'PASOR',
  ID_CARD: 'IDENT',
  DRIVING_LICENSE: 'PATEN',
  RESIDENCE_PERMIT: 'PERMS',
  OTHER: 'IDENT',
};

const ROLE_CODES: Record<AlloggiatiGuest['role'], string> = {
  single: '16',
  family_head: '17',
  family_member: '18',
  group_head: '19',
  group_member: '20',
};

/** Pad on the right with spaces to fixed length, truncate if too long. */
function padFixed(s: string, len: number): string {
  const x = (s ?? '').toString();
  if (x.length >= len) return x.slice(0, len);
  return x + ' '.repeat(len - x.length);
}

/** Date YYYY-MM-DD → DD/MM/YYYY (10 char). */
function fmtDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ' '.repeat(10);
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtNights(n: number): string {
  const x = Math.max(1, Math.min(99, Math.floor(n)));
  return x.toString().padStart(2, '0');
}

function normaliseName(s: string): string {
  // Polizia: solo lettere maiuscole, spazi, apostrofi.
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a single fixed-width record. Returns 168-char string.
 *
 * Layout (1-indexed col offsets):
 *  1  -2   tipo alloggiato (2 char)
 *  3  -12  data arrivo GG/MM/AAAA (10 char)
 *  13 -14  giorni permanenza (2 char)
 *  15 -64  cognome (50 char)
 *  65 -94  nome (30 char)
 *  95      sesso (1 char)
 *  96 -105 data nascita GG/MM/AAAA (10 char)
 *  106-114 codice comune nascita (9 char) — opzionale, lasciato spazi
 *  115-123 codice stato nascita (9 char)
 *  124-132 codice cittadinanza (9 char)
 *  133-137 tipo documento (5 char)
 *  138-157 numero documento (20 char)
 *  158-166 codice stato rilascio documento (9 char)
 *  Padding finale a 168 char con spazi.
 */
export function buildAlloggiatiLine(g: AlloggiatiGuest): string {
  const parts: string[] = [];
  parts.push(ROLE_CODES[g.role]);                                 // 1-2
  parts.push(fmtDate(g.arrivalDate));                             // 3-12
  parts.push(fmtNights(g.numNights));                             // 13-14
  parts.push(padFixed(normaliseName(g.surname), 50));             // 15-64
  parts.push(padFixed(normaliseName(g.givenNames), 30));          // 65-94
  parts.push(g.sex === 'F' ? 'F' : g.sex === 'X' ? 'M' : 'M');    // 95
  parts.push(fmtDate(g.birthDate));                               // 96-105
  parts.push(padFixed('', 9));                                    // 106-114 codice comune nascita (TODO tabella comuni)
  parts.push(alloggiatiCountryCode(g.birthCountryCode3));         // 115-123
  parts.push(alloggiatiCountryCode(g.citizenshipCode3));          // 124-132
  parts.push(padFixed(ALLOGGIATI_DOC_TYPES[g.documentType], 5));  // 133-137
  parts.push(padFixed(g.documentNumber.toUpperCase().replace(/\s/g, ''), 20)); // 138-157
  parts.push(
    g.documentIssuingCountryCode3
      ? alloggiatiCountryCode(g.documentIssuingCountryCode3)
      : alloggiatiCountryCode(g.citizenshipCode3),
  );                                                              // 158-166
  parts.push('  ');                                               // 167-168 padding finale

  const line = parts.join('');
  if (line.length !== 168) {
    // Pad/trim to exact width — il portale rifiuta righe non conformi.
    return line.length > 168 ? line.slice(0, 168) : line + ' '.repeat(168 - line.length);
  }
  return line;
}

/** Build the full Alloggiati Web file content (multi-guest). */
export function buildAlloggiatiFile(guests: AlloggiatiGuest[]): string {
  // Polizia portal accepts CRLF line endings.
  return guests.map(buildAlloggiatiLine).join('\r\n') + '\r\n';
}

/** Build a human-readable CSV preview, also useful for debugging. */
export function buildAlloggiatiCsv(guests: AlloggiatiGuest[]): string {
  const header = [
    'tipo',
    'arrivo',
    'notti',
    'cognome',
    'nome',
    'sesso',
    'nascita',
    'paeseNascita',
    'cittadinanza',
    'tipoDocumento',
    'numeroDocumento',
    'paeseRilascio',
  ].join(',');
  const rows = guests.map((g) => {
    const csvFields = [
      ROLE_CODES[g.role],
      fmtDate(g.arrivalDate),
      String(g.numNights),
      normaliseName(g.surname),
      normaliseName(g.givenNames),
      g.sex,
      fmtDate(g.birthDate),
      italianCountryName(g.birthCountryCode3),
      italianCountryName(g.citizenshipCode3),
      ALLOGGIATI_DOC_TYPES[g.documentType],
      g.documentNumber,
      g.documentIssuingCountryCode3
        ? italianCountryName(g.documentIssuingCountryCode3)
        : italianCountryName(g.citizenshipCode3),
    ];
    return csvFields.map(csvEscape).join(',');
  });
  return [header, ...rows].join('\n');
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Convenience: enrich a country code, expose for UI. */
export function describeCountry(code3: string): CountryInfo | undefined {
  return lookupByCode3(code3);
}
