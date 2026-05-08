import { describe, it, expect } from 'vitest';
import { parseIcal, guessLeadName, bookingSourceFromIcal } from '@/lib/ical/sync';

const AIRBNB_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTEND;VALUE=DATE:20260612
DTSTART;VALUE=DATE:20260605
UID:reservation-HMCDR1234@airbnb.com
DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMCDR1234\\nCheck-in: Friday\\, June 5\\, 2026
SUMMARY:Reserved - Anna Müller
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:20260620
DTSTART;VALUE=DATE:20260615
UID:airbnb-block-789@airbnb.com
SUMMARY:Airbnb (Not available)
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

describe('parseIcal', () => {
  it('parses Airbnb reservations', () => {
    const events = parseIcal(AIRBNB_ICS);
    expect(events).toHaveLength(2);
    expect(events[0]?.uid).toContain('HMCDR1234');
    expect(events[0]?.source).toBe('airbnb');
  });

  it('preserves the duration of the stay', () => {
    const events = parseIcal(AIRBNB_ICS);
    const ev = events[0];
    expect(ev).toBeDefined();
    // VALUE=DATE events can shift by 1 day across timezones, so we just
    // verify the night count.
    const days = Math.round(
      ((ev?.end.getTime() ?? 0) - (ev?.start.getTime() ?? 0)) / (1000 * 60 * 60 * 24),
    );
    expect(days).toBe(7);
  });

  it('empty input returns empty array', () => {
    expect(parseIcal('')).toEqual([]);
  });
  it('throws on malformed ICS so runner can surface the error to the host', () => {
    expect(() => parseIcal('not valid ics')).toThrow(/parse failed/i);
  });
});

describe('guessLeadName', () => {
  it('extracts the name after "Reserved -"', () => {
    expect(
      guessLeadName({
        uid: 'x',
        summary: 'Reserved - Anna Müller',
        start: new Date(),
        end: new Date(),
        description: '',
        status: 'CONFIRMED',
        source: 'airbnb',
      }),
    ).toBe('Anna Müller');
  });
  it('falls back to a generic label for "Reserved"', () => {
    expect(
      guessLeadName({
        uid: 'x',
        summary: 'Reserved',
        start: new Date(),
        end: new Date(),
        description: '',
        status: 'CONFIRMED',
        source: 'airbnb',
      }),
    ).toBe('Ospite Airbnb');
  });
});

describe('bookingSourceFromIcal', () => {
  it('maps strings to enum values', () => {
    expect(bookingSourceFromIcal('airbnb')).toBe('AIRBNB');
    expect(bookingSourceFromIcal('booking')).toBe('BOOKING');
    expect(bookingSourceFromIcal('vrbo')).toBe('VRBO');
    expect(bookingSourceFromIcal('other')).toBe('DIRECT');
  });
});
