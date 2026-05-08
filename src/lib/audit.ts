/**
 * Audit log strutturato. Ogni evento sensibile (OCR, face match, export
 * Alloggiati, accessi) viene registrato. Per la conformità GDPR e per
 * eventuali ispezioni: dimostrare cosa è successo, quando, da quale IP.
 */

import { prisma } from './db';

export interface AuditEvent {
  event:
    | 'host.signup'
    | 'host.login'
    | 'host.logout'
    | 'host.password_changed'
    | 'host.alloggiati_updated'
    | 'host.gdpr_export'
    | 'host.account_deleted'
    | 'property.updated'
    | 'property.archived'
    | 'booking.cancelled'
    | 'checkin.reset'
    | 'guest.checkin.start'
    | 'guest.consent.accept'
    | 'document.upload'
    | 'ocr.success'
    | 'ocr.partial'
    | 'ocr.failed'
    | 'liveness.success'
    | 'liveness.failed'
    | 'facematch.success'
    | 'facematch.failed'
    | 'facematch.review_required'
    | 'guest.verified'
    | 'alloggiati.exported'
    | 'concierge.message'
    | 'data.cleanup';
  hostId?: string;
  guestId?: string;
  bookingId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function audit(event: AuditEvent): Promise<void> {
  await prisma.auditLog.create({
    data: {
      event: event.event,
      hostId: event.hostId,
      guestId: event.guestId,
      bookingId: event.bookingId,
      details: event.details ? (event.details as object) : undefined,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    },
  });
}

/** Attach the request's IP and user-agent to subsequent audit calls. */
export function ipAndUaFromHeaders(headers: Headers): {
  ipAddress?: string;
  userAgent?: string;
} {
  const xff = headers.get('x-forwarded-for');
  const ip = xff?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? undefined;
  const ua = headers.get('user-agent') ?? undefined;
  return { ipAddress: ip ?? undefined, userAgent: ua };
}
