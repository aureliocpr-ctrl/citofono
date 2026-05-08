/**
 * Sync dei calendari iCal (Airbnb, Booking, VRBO).
 *
 * Ogni piattaforma pubblica un .ics export. Lo parsiamo e creiamo Booking
 * stub: i dati anagrafici dell'ospite arrivano dal vero check-in, ma la
 * data di arrivo/partenza, il numero di ospiti, e l'external reference
 * sono già pronti.
 *
 * Strategia di idempotenza: usiamo (propertyId, externalRef) come chiave
 * naturale. Un evento iCal con UID già visto viene aggiornato (date / status),
 * non duplicato.
 */

import ICAL from 'ical.js';

export interface IcalEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  description: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
  /** Source detected from URL or summary, "airbnb"|"booking"|"vrbo"|"other". */
  source: string;
}

export function parseIcal(icsText: string, sourceHint?: string): IcalEvent[] {
  if (!icsText.trim()) return [];
  let jcal: unknown;
  try {
    jcal = ICAL.parse(icsText);
  } catch {
    return [];
  }
  const comp = new ICAL.Component(jcal as Array<unknown>);
  const events = comp.getAllSubcomponents('vevent');
  const out: IcalEvent[] = [];
  for (const e of events) {
    const ev = new ICAL.Event(e);
    const start = ev.startDate?.toJSDate();
    const end = ev.endDate?.toJSDate();
    if (!start || !end) continue;
    const summary = ev.summary ?? '';
    const description = ev.description ?? '';
    const statusRaw = e.getFirstPropertyValue('status');
    const status = String(statusRaw ?? 'CONFIRMED').toUpperCase() as IcalEvent['status'];
    // Airbnb pubblica eventi "Reserved" o "Not available" — entrambi rappresentano
    // un blocco del calendario. Tenteremo a importare solo quelli con UID che
    // contiene 'airbnb.com' o 'booking.com'.
    out.push({
      uid: ev.uid,
      summary,
      start,
      end,
      description,
      status,
      source: detectSource(ev.uid, summary, sourceHint),
    });
  }
  return out;
}

function detectSource(uid: string, summary: string, hint?: string): string {
  const haystack = `${uid} ${summary} ${hint ?? ''}`.toLowerCase();
  if (haystack.includes('airbnb')) return 'airbnb';
  if (haystack.includes('booking.com')) return 'booking';
  if (haystack.includes('vrbo')) return 'vrbo';
  if (hint) return hint.toLowerCase();
  return 'other';
}

/**
 * Estrai un nome lead dai campi summary/description di Airbnb.
 * Airbnb mette tipicamente "Reserved - Mario Rossi" o simile.
 */
export function guessLeadName(ev: IcalEvent): string {
  const text = ev.summary || ev.description || '';
  const m = text.match(/Reserved\s*[-–:]\s*(.+)/i);
  if (m && m[1]) return m[1].trim().slice(0, 80);
  if (text.toLowerCase().includes('reserved')) return 'Ospite Airbnb';
  return text.slice(0, 80) || 'Ospite';
}

export function guessNumGuests(_ev: IcalEvent): number {
  // Airbnb non espone il numero di ospiti via iCal pubblico — default 2
  return 2;
}

export function bookingSourceFromIcal(source: string): 'AIRBNB' | 'BOOKING' | 'VRBO' | 'DIRECT' {
  switch (source) {
    case 'airbnb':
      return 'AIRBNB';
    case 'booking':
      return 'BOOKING';
    case 'vrbo':
      return 'VRBO';
    default:
      return 'DIRECT';
  }
}
