/**
 * Imposta di soggiorno per Comune.
 *
 * Tabella curata dei principali Comuni turistici italiani con la tariffa
 * "extra-alberghiero / locazione breve" media. La tariffa effettiva varia
 * per categoria di struttura e per stagionalità — questa è la baseline
 * tipicamente applicata agli affitti brevi.
 *
 * Fonti: delibere comunali pubblicate sui siti dei Comuni (al maggio 2026).
 * Importi in euro per persona per notte.
 *
 * Le strutture in deroga (host con CdI ridotti, esenzioni minori, etc.)
 * possono comunque sovrascrivere il valore in `Property.taxPerPersonNight`.
 */

export interface ComuneTax {
  /** Comune in maiuscolo per match facile. */
  comune: string;
  province: string; // sigla
  perPersonNight: number; // €
  /** Numero massimo di notti su cui si applica l'imposta (es. 10 a Roma). */
  maxNights: number;
  /** Esenzione under-N anni (default 12). Approssimato. */
  exemptUnder: number;
}

const TABLE: ComuneTax[] = [
  { comune: 'ROMA', province: 'RM', perPersonNight: 6.0, maxNights: 10, exemptUnder: 10 },
  { comune: 'MILANO', province: 'MI', perPersonNight: 5.0, maxNights: 14, exemptUnder: 18 },
  { comune: 'VENEZIA', province: 'VE', perPersonNight: 5.0, maxNights: 5, exemptUnder: 10 },
  { comune: 'FIRENZE', province: 'FI', perPersonNight: 5.5, maxNights: 7, exemptUnder: 12 },
  { comune: 'NAPOLI', province: 'NA', perPersonNight: 5.0, maxNights: 14, exemptUnder: 18 },
  { comune: 'TORINO', province: 'TO', perPersonNight: 3.7, maxNights: 7, exemptUnder: 18 },
  { comune: 'BOLOGNA', province: 'BO', perPersonNight: 5.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'PALERMO', province: 'PA', perPersonNight: 4.0, maxNights: 4, exemptUnder: 18 },
  { comune: 'GENOVA', province: 'GE', perPersonNight: 3.0, maxNights: 8, exemptUnder: 14 },
  { comune: 'VERONA', province: 'VR', perPersonNight: 3.5, maxNights: 5, exemptUnder: 16 },
  { comune: 'PISA', province: 'PI', perPersonNight: 2.5, maxNights: 7, exemptUnder: 12 },
  { comune: 'SIENA', province: 'SI', perPersonNight: 4.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'AMALFI', province: 'SA', perPersonNight: 3.0, maxNights: 7, exemptUnder: 18 },
  { comune: 'POSITANO', province: 'SA', perPersonNight: 3.5, maxNights: 7, exemptUnder: 18 },
  { comune: 'SORRENTO', province: 'NA', perPersonNight: 3.0, maxNights: 7, exemptUnder: 18 },
  { comune: 'CAPRI', province: 'NA', perPersonNight: 3.5, maxNights: 7, exemptUnder: 18 },
  { comune: 'TAORMINA', province: 'ME', perPersonNight: 3.5, maxNights: 7, exemptUnder: 18 },
  { comune: 'CATANIA', province: 'CT', perPersonNight: 3.0, maxNights: 5, exemptUnder: 18 },
  { comune: 'BARI', province: 'BA', perPersonNight: 3.5, maxNights: 7, exemptUnder: 18 },
  { comune: 'LECCE', province: 'LE', perPersonNight: 2.5, maxNights: 5, exemptUnder: 14 },
  { comune: 'POLIGNANO A MARE', province: 'BA', perPersonNight: 3.0, maxNights: 7, exemptUnder: 14 },
  { comune: 'OSTUNI', province: 'BR', perPersonNight: 2.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'ALGHERO', province: 'SS', perPersonNight: 3.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'OLBIA', province: 'OT', perPersonNight: 3.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'CAGLIARI', province: 'CA', perPersonNight: 3.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'RIMINI', province: 'RN', perPersonNight: 2.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'VIAREGGIO', province: 'LU', perPersonNight: 2.5, maxNights: 5, exemptUnder: 12 },
  { comune: 'PERUGIA', province: 'PG', perPersonNight: 2.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'ASSISI', province: 'PG', perPersonNight: 2.5, maxNights: 5, exemptUnder: 14 },
  { comune: 'SPERLONGA', province: 'LT', perPersonNight: 2.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'GAETA', province: 'LT', perPersonNight: 2.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'TIVOLI', province: 'RM', perPersonNight: 2.5, maxNights: 5, exemptUnder: 14 },
  { comune: 'VITERBO', province: 'VT', perPersonNight: 2.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'FRASCATI', province: 'RM', perPersonNight: 2.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'PADOVA', province: 'PD', perPersonNight: 3.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'BERGAMO', province: 'BG', perPersonNight: 3.0, maxNights: 7, exemptUnder: 14 },
  { comune: 'BRESCIA', province: 'BS', perPersonNight: 2.5, maxNights: 5, exemptUnder: 14 },
  { comune: 'COMO', province: 'CO', perPersonNight: 3.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'BELLAGIO', province: 'CO', perPersonNight: 4.0, maxNights: 7, exemptUnder: 14 },
  { comune: 'TRIESTE', province: 'TS', perPersonNight: 2.5, maxNights: 5, exemptUnder: 14 },
  { comune: 'TRENTO', province: 'TN', perPersonNight: 2.5, maxNights: 5, exemptUnder: 14 },
  { comune: 'BOLZANO', province: 'BZ', perPersonNight: 2.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'AOSTA', province: 'AO', perPersonNight: 2.0, maxNights: 5, exemptUnder: 14 },
  { comune: 'COURMAYEUR', province: 'AO', perPersonNight: 3.0, maxNights: 7, exemptUnder: 14 },
  { comune: 'CORTINA D\'AMPEZZO', province: 'BL', perPersonNight: 4.5, maxNights: 7, exemptUnder: 14 },
  { comune: 'MATERA', province: 'MT', perPersonNight: 2.5, maxNights: 5, exemptUnder: 14 },
];

const BY_NAME = new Map(TABLE.map((c) => [c.comune.toUpperCase(), c]));

export function lookupComune(comune: string): ComuneTax | undefined {
  return BY_NAME.get(comune.trim().toUpperCase());
}

export interface TaxComputation {
  perPersonNight: number;
  numGuests: number;
  numNights: number;
  effectiveNights: number; // capped by maxNights
  exemptedGuests: number;
  total: number;
  source: 'table' | 'override' | 'unknown';
  comune?: string;
}

export interface TaxInput {
  comune: string;
  numGuests: number;
  numNights: number;
  guestAges?: number[]; // length should match numGuests; missing → considered adult
  override?: { perPersonNight: number; maxNights?: number };
}

export function computeSoggiornoTax(input: TaxInput): TaxComputation {
  const exemptUnderDefault = 12;
  let perPersonNight: number;
  let maxNights: number;
  let exemptUnder = exemptUnderDefault;
  let source: TaxComputation['source'];
  let comuneName: string | undefined;

  if (input.override) {
    perPersonNight = input.override.perPersonNight;
    maxNights = input.override.maxNights ?? 999;
    source = 'override';
  } else {
    const c = lookupComune(input.comune);
    if (c) {
      perPersonNight = c.perPersonNight;
      maxNights = c.maxNights;
      exemptUnder = c.exemptUnder;
      source = 'table';
      comuneName = c.comune;
    } else {
      perPersonNight = 0;
      maxNights = 0;
      source = 'unknown';
    }
  }

  const effectiveNights = Math.min(input.numNights, maxNights);
  const exemptedGuests = (input.guestAges ?? []).filter(
    (a) => typeof a === 'number' && a < exemptUnder,
  ).length;
  const payingGuests = Math.max(0, input.numGuests - exemptedGuests);
  const total = perPersonNight * payingGuests * effectiveNights;

  return {
    perPersonNight,
    numGuests: input.numGuests,
    numNights: input.numNights,
    effectiveNights,
    exemptedGuests,
    total: Math.round(total * 100) / 100,
    source,
    comune: comuneName,
  };
}

export const ALL_COMUNI: readonly ComuneTax[] = TABLE;
