/**
 * Email transazionali via Resend.
 *
 * 3 template (italiano + inglese fallback per ospiti stranieri):
 *   - guestCheckIn(toName, link, propertyName, lang)
 *   - hostGuestVerified(hostEmail, propertyName, guestName)
 *   - hostCheckInReview(hostEmail, propertyName, guestName, reviewLink)
 */

import { Resend } from 'resend';

let cached: Resend | null = null;
function client(): Resend {
  if (!cached) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY missing');
    cached = new Resend(key);
  }
  return cached;
}

const FROM = process.env.EMAIL_FROM ?? 'Citofono <noreply@citofono.app>';

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function send(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    // Fallback in dev: stampa l'email a console invece di spedirla.
    console.log('[email DEV]', { to, subject });
    console.log(text);
    return { ok: true };
  }
  try {
    const res = await client().emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, id: res.data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─────────── Template 1: link check-in all'ospite ───────────

export async function sendGuestCheckInLink(args: {
  to: string;
  toName: string;
  link: string;
  propertyName: string;
  lang?: 'it' | 'en';
}): Promise<SendResult> {
  const lang = args.lang ?? 'it';
  if (lang === 'en') {
    const subject = `Check-in for your stay at ${args.propertyName}`;
    const text = `Hi ${args.toName},

your host needs to verify your identity before you check in at ${args.propertyName}.

Open this link from your phone:

${args.link}

It takes 90 seconds: a photo of your passport or ID, a quick selfie, done.

— Citofono`;
    const html = `
<p>Hi ${esc(args.toName)},</p>
<p>your host needs to verify your identity before you check in at <strong>${esc(args.propertyName)}</strong>.</p>
<p>Open this link from your phone:</p>
<p><a href="${args.link}" style="background:#0b0b0c;color:#ffd400;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600">Start the check-in →</a></p>
<p style="color:#666;font-size:14px">It takes 90 seconds: a photo of your passport or ID, a quick selfie, done.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
<p style="color:#999;font-size:12px">— Citofono</p>`;
    return send(args.to, subject, html, text);
  }
  const subject = `Check-in per il tuo soggiorno a ${args.propertyName}`;
  const text = `Ciao ${args.toName},

il tuo host deve verificare la tua identità prima del check-in a ${args.propertyName}.

Apri questo link dal cellulare:

${args.link}

Bastano 90 secondi: una foto del passaporto/carta d'identità, un selfie veloce, finito.

— Citofono`;
  const html = `
<p>Ciao ${esc(args.toName)},</p>
<p>il tuo host deve verificare la tua identità prima del check-in a <strong>${esc(args.propertyName)}</strong>.</p>
<p>Apri questo link dal cellulare:</p>
<p><a href="${args.link}" style="background:#0b0b0c;color:#ffd400;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600">Inizia il check-in →</a></p>
<p style="color:#666;font-size:14px">Bastano 90 secondi: una foto del documento, un selfie veloce, finito.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
<p style="color:#999;font-size:12px">— Citofono</p>`;
  return send(args.to, subject, html, text);
}

// ─────────── Template 2: ospite verificato, notifica all'host ───────────

export async function sendHostGuestVerified(args: {
  to: string;
  hostName: string;
  propertyName: string;
  guestName: string;
  bookingLink: string;
}): Promise<SendResult> {
  const subject = `${args.guestName} ha completato il check-in`;
  const text = `Ciao ${args.hostName},

${args.guestName} ha completato la verifica per ${args.propertyName}.

La schedina Alloggiati Web è pronta da scaricare:
${args.bookingLink}

— Citofono`;
  const html = `
<p>Ciao ${esc(args.hostName)},</p>
<p><strong>${esc(args.guestName)}</strong> ha completato la verifica per <strong>${esc(args.propertyName)}</strong>.</p>
<p>La schedina Alloggiati Web è pronta da scaricare:</p>
<p><a href="${args.bookingLink}" style="background:#0b0b0c;color:#ffd400;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600">Apri la prenotazione →</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
<p style="color:#999;font-size:12px">— Citofono</p>`;
  return send(args.to, subject, html, text);
}

// ─────────── Template 3: review richiesta ───────────

export async function sendHostCheckInReview(args: {
  to: string;
  hostName: string;
  propertyName: string;
  guestName: string;
  reviewLink: string;
}): Promise<SendResult> {
  const subject = `Verifica manuale richiesta: ${args.guestName}`;
  const text = `Ciao ${args.hostName},

la verifica di ${args.guestName} per ${args.propertyName} ha avuto una similarità borderline. Controlla manualmente:

${args.reviewLink}

— Citofono`;
  const html = `
<p>Ciao ${esc(args.hostName)},</p>
<p>la verifica di <strong>${esc(args.guestName)}</strong> per <strong>${esc(args.propertyName)}</strong> ha avuto una similarità borderline. Controlla manualmente:</p>
<p><a href="${args.reviewLink}" style="background:#0b0b0c;color:#ffd400;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600">Apri la verifica →</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
<p style="color:#999;font-size:12px">— Citofono</p>`;
  return send(args.to, subject, html, text);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
