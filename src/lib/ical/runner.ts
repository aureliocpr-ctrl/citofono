/**
 * Runner del sync iCal: per ogni Property con icalUrls configurati, fetcha
 * gli URL, parsa, fa upsert dei Booking.
 *
 * Decoupled da fetch (per testabilità). In produzione usa il fetch globale.
 */

import type { PrismaClient, Property } from '@prisma/client';
import {
  parseIcal,
  bookingSourceFromIcal,
  guessLeadName,
  guessNumGuests,
  type IcalEvent,
} from './sync';

export interface SyncResult {
  propertiesProcessed: number;
  eventsImported: number;
  eventsSkipped: number;
  errors: string[];
}

export interface SyncOptions {
  fetcher?: (url: string) => Promise<string>;
  now?: Date;
}

const DEFAULT_FETCHER = async (url: string): Promise<string> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} failed: ${r.status}`);
  return r.text();
};

export async function syncAllProperties(
  prisma: PrismaClient,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const fetcher = opts.fetcher ?? DEFAULT_FETCHER;
  const now = opts.now ?? new Date();
  const result: SyncResult = {
    propertiesProcessed: 0,
    eventsImported: 0,
    eventsSkipped: 0,
    errors: [],
  };

  // Prisma's Json filter is awkward for "not null AND non-empty array" in a
  // portable way; fetch active properties and filter in JS. Volume is small.
  const allActive = await prisma.property.findMany({
    where: { archivedAt: null },
  });
  const properties = allActive.filter((p) => extractIcalUrls(p).length > 0);

  for (const prop of properties) {
    const urls = extractIcalUrls(prop);
    result.propertiesProcessed++;
    for (const url of urls) {
      try {
        const ics = await fetcher(url);
        const events = parseIcal(ics);
        for (const ev of events) {
          if (await processEvent(prisma, prop, ev)) {
            result.eventsImported++;
          } else {
            result.eventsSkipped++;
          }
        }
      } catch (err) {
        result.errors.push(`${prop.id}|${url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await prisma.property.update({
      where: { id: prop.id },
      data: { icalLastSync: now },
    });
  }

  return result;
}

function extractIcalUrls(prop: Property): string[] {
  const raw = prop.icalUrls;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  if (typeof raw === 'string') return [raw];
  return [];
}

/** Returns true if the booking was imported (created), false if skipped or updated. */
async function processEvent(
  prisma: PrismaClient,
  prop: Property,
  ev: IcalEvent,
): Promise<boolean> {
  // Skip "Not available" placeholder events that Airbnb sometimes pushes
  if (/not\s+available|airbnb\s*\(not\s*available\)/i.test(ev.summary)) return false;

  const externalRef = ev.uid.slice(0, 80);
  const existing = await prisma.booking.findFirst({
    where: { propertyId: prop.id, externalRef },
  });

  // L'evento è stato cancellato sul calendario sorgente.
  // Se abbiamo già un booking, marchiamolo CANCELLED — non vogliamo che
  // l'host venda di nuovo le date pensando che siano libere quando non lo
  // sono, e non vogliamo che il guest possa ancora completare check-in.
  if (ev.status === 'CANCELLED') {
    if (existing && existing.status !== 'CANCELLED') {
      await prisma.booking.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
      });
    }
    return false;
  }

  const tokenExp = new Date(ev.end);
  tokenExp.setDate(tokenExp.getDate() + 1);

  if (existing) {
    // Aggiorna le date in caso di modifica sul calendario sorgente. Mantieni
    // numGuests perché può essere stato corretto manualmente dall'host.
    // Aggiorna anche checkInTokenExp così il link guest resta valido fino al
    // nuovo checkout + 1 giorno.
    const newTokenExp = new Date(ev.end);
    newTokenExp.setDate(newTokenExp.getDate() + 1);
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        checkInDate: ev.start,
        checkOutDate: ev.end,
        checkInTokenExp: newTokenExp,
      },
    });
    return false;
  }

  await prisma.booking.create({
    data: {
      propertyId: prop.id,
      externalRef,
      source: bookingSourceFromIcal(ev.source),
      checkInDate: ev.start,
      checkOutDate: ev.end,
      numGuests: guessNumGuests(ev),
      leadName: guessLeadName(ev),
      checkInTokenExp: tokenExp,
      checkIn: { create: {} },
    },
  });
  return true;
}
