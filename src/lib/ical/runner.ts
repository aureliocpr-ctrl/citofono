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

  const properties = await prisma.property.findMany({
    where: { archivedAt: null, NOT: { icalUrls: { equals: null as unknown as object } } },
  });

  for (const prop of properties) {
    const urls = extractIcalUrls(prop);
    if (urls.length === 0) continue;
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
  if (ev.status === 'CANCELLED') return false;
  // Skip "Not available" placeholder events that Airbnb sometimes pushes
  if (/not\s+available|airbnb\s*\(not\s*available\)/i.test(ev.summary)) return false;

  const externalRef = ev.uid.slice(0, 80);
  const existing = await prisma.booking.findFirst({
    where: { propertyId: prop.id, externalRef },
  });

  const tokenExp = new Date(ev.end);
  tokenExp.setDate(tokenExp.getDate() + 1);

  if (existing) {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        checkInDate: ev.start,
        checkOutDate: ev.end,
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
