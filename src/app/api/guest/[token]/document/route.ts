/**
 * POST /api/guest/[token]/document
 *
 * Riceve l'immagine del documento (multipart/form-data, campo "file") +
 * guestId + side (front/back). Esegue OCR via Tesseract, prova a estrarre
 * MRZ, salva l'immagine grezza su storage con TTL breve, salva i dati
 * estratti su DB. Restituisce i campi parsati per la review umana.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadGuestSession } from '@/lib/guestSession';
import { putObject, documentKey } from '@/lib/storage';
import { ocrImage } from '@/lib/ocr/runner';
import { extractFromOcrText } from '@/lib/ocr/extract';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';
import type { DocumentSide } from '@prisma/client';

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const sess = await loadGuestSession(token);
  if (!sess) return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 404 });

  const form = await req.formData();
  const guestId = form.get('guestId');
  const sideRaw = form.get('side');
  const file = form.get('file');

  if (typeof guestId !== 'string' || !file || !(file instanceof File)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const side: DocumentSide = sideRaw === 'BACK' ? 'BACK' : 'FRONT';

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: sess.booking.id },
  });
  if (!guest) return NextResponse.json({ error: 'guest_not_found' }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const key = documentKey(sess.booking.id, guest.id, side === 'FRONT' ? 'front' : 'back', ext);
  await putObject(key, buf, file.type || 'image/jpeg', { ttlCategory: 'verification' });

  let extracted: ReturnType<typeof extractFromOcrText> | null = null;
  let rawText = '';
  try {
    const out = await ocrImage(buf);
    rawText = out.text;
    extracted = extractFromOcrText(rawText);
  } catch (err) {
    await audit({
      event: 'ocr.failed',
      bookingId: sess.booking.id,
      guestId: guest.id,
      details: { error: err instanceof Error ? err.message : String(err) },
      ...ipAndUaFromHeaders(req.headers),
    });
    return NextResponse.json({ error: 'ocr_failed' }, { status: 500 });
  }

  await prisma.document.create({
    data: {
      guestId: guest.id,
      s3Key: key,
      side,
      ocrText: rawText.slice(0, 8000),
      mrzRaw: extracted.mrz ? rawText.slice(0, 200) : null,
      parsedJson: (extracted as unknown) as object,
    },
  });

  // Update guest with extracted fields (only if not already set, so back-side
  // upload doesn't overwrite front-side data)
  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      firstName: guest.firstName ?? extracted.givenNames ?? null,
      lastName: guest.lastName ?? extracted.surname ?? null,
      birthDate: guest.birthDate ?? (extracted.birthDate ? new Date(extracted.birthDate) : null),
      nationality: guest.nationality ?? extracted.nationality ?? null,
      sex: guest.sex ?? (extracted.sex === 'X' ? null : extracted.sex ?? null),
      docType: guest.docType ?? extracted.documentType ?? null,
      docNumber: guest.docNumber ?? extracted.documentNumber ?? null,
      docIssuingCountry: guest.docIssuingCountry ?? extracted.issuingCountry ?? null,
      docExpiresAt: guest.docExpiresAt ?? (extracted.expirationDate ? new Date(extracted.expirationDate) : null),
    },
  });

  await audit({
    event: extracted.confidence >= 0.8 ? 'ocr.success' : 'ocr.partial',
    bookingId: sess.booking.id,
    guestId: guest.id,
    details: {
      source: extracted.source,
      confidence: extracted.confidence,
      needsReview: extracted.needsReview,
    },
    ...ipAndUaFromHeaders(req.headers),
  });

  return NextResponse.json({
    confidence: extracted.confidence,
    source: extracted.source,
    needsReview: extracted.needsReview,
    fields: {
      surname: extracted.surname,
      givenNames: extracted.givenNames,
      birthDate: extracted.birthDate,
      nationality: extracted.nationalityItalian,
      documentType: extracted.documentType,
      documentNumber: extracted.documentNumber,
      issuingCountry: extracted.issuingCountryItalian,
      sex: extracted.sex,
      expirationDate: extracted.expirationDate,
    },
  });
}
