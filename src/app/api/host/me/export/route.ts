/**
 * GET /api/host/me/export
 *
 * GDPR Art. 20 — Diritto alla portabilità dei dati. L'host scarica un dump
 * JSON completo del proprio account: profilo, properties, bookings, guests,
 * documenti (metadati, NON i file binari), check-in, audit log.
 *
 * I FaceEmbedding sono esclusi: sono dati biometrici derivati e l'utente
 * proprietario del dato è l'OSPITE, non l'host. L'host non ha base legale
 * per esportare quei vettori.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit, ipAndUaFromHeaders } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user } = await validateRequest();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const host = await prisma.host.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      vatNumber: true,
      taxCode: true,
      plan: true,
      planRenewsAt: true,
      acceptedTermsAt: true,
      acceptedDpiaAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!host) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [properties, bookings, auditLog] = await Promise.all([
    prisma.property.findMany({
      where: { hostId: user.id },
      include: {
        knowledgeChunks: { select: { id: true, topic: true, content: true, language: true, createdAt: true } },
      },
    }),
    prisma.booking.findMany({
      where: { property: { hostId: user.id } },
      include: {
        guests: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            nationality: true,
            sex: true,
            docType: true,
            docNumber: true,
            docIssuingCountry: true,
            docExpiresAt: true,
            verified: true,
            verifiedAt: true,
            matchScore: true,
            createdAt: true,
            documents: {
              select: { id: true, side: true, s3Key: true, uploadedAt: true },
            },
          },
        },
        checkIn: { select: { status: true, startedAt: true, completedAt: true, taxAmount: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { hostId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ]);

  const dump = {
    version: 1,
    exportedAt: new Date().toISOString(),
    note: 'Export GDPR Art. 20. Le foto dei documenti e i selfie non sono inclusi: sono dati personali degli ospiti (terzi), non tuoi.',
    host,
    properties,
    bookings,
    auditLog: auditLog.map((a) => ({
      event: a.event,
      bookingId: a.bookingId,
      details: a.details,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      createdAt: a.createdAt,
    })),
  };

  await audit({
    event: 'host.gdpr_export',
    hostId: user.id,
    ...ipAndUaFromHeaders(req.headers),
  });

  const filename = `citofono-export-${user.id}-${Date.now()}.json`;
  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
