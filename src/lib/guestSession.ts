/**
 * Wrapper per validare il token pubblico del guest in tutte le API route.
 * Il token vive sul DB con scadenza (Booking.checkInTokenExp). Quando un guest
 * fa una richiesta, lo recuperiamo e ritorniamo Booking + Property — tutto
 * il resto delle API si appoggia a questo helper.
 */

import { prisma } from './db';
import type { Booking, Property } from '@prisma/client';

export interface GuestSession {
  booking: Booking;
  property: Property;
}

export async function loadGuestSession(token: string): Promise<GuestSession | null> {
  const booking = await prisma.booking.findUnique({
    where: { checkInToken: token },
    include: { property: true },
  });
  if (!booking) return null;
  if (booking.checkInTokenExp < new Date()) return null;
  return { booking, property: booking.property };
}
