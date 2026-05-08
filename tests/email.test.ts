import { describe, it, expect } from 'vitest';
import {
  sendGuestCheckInLink,
  sendHostGuestVerified,
  sendHostCheckInReview,
} from '@/lib/email';

// We don't have a Resend key in tests — the module falls back to a console
// log + ok=true. We just verify the helper accepts the args without throwing
// and surfaces the dev fallback path.

describe('email helpers (dev fallback path)', () => {
  it('sendGuestCheckInLink resolves ok in italiano', async () => {
    const r = await sendGuestCheckInLink({
      to: 'guest@example.com',
      toName: 'Mario',
      link: 'https://example.com/v/abc',
      propertyName: 'Casa al mare',
      lang: 'it',
    });
    expect(r.ok).toBe(true);
  });

  it('sendGuestCheckInLink resolves ok in english', async () => {
    const r = await sendGuestCheckInLink({
      to: 'guest@example.com',
      toName: 'Anna',
      link: 'https://example.com/v/xyz',
      propertyName: 'Beach house',
      lang: 'en',
    });
    expect(r.ok).toBe(true);
  });

  it('sendHostGuestVerified resolves ok', async () => {
    const r = await sendHostGuestVerified({
      to: 'host@example.com',
      hostName: 'Aurelio',
      propertyName: 'Casa',
      guestName: 'Mario Rossi',
      bookingLink: 'https://example.com/bookings/1',
    });
    expect(r.ok).toBe(true);
  });

  it('sendHostCheckInReview resolves ok', async () => {
    const r = await sendHostCheckInReview({
      to: 'host@example.com',
      hostName: 'Aurelio',
      propertyName: 'Casa',
      guestName: 'Mario Rossi',
      reviewLink: 'https://example.com/bookings/1',
    });
    expect(r.ok).toBe(true);
  });
});
