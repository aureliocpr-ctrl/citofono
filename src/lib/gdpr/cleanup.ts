/**
 * Pulizia GDPR — modulo puro testabile.
 *
 * Tre operazioni:
 *   1. cancella i FaceEmbedding scheduledDeleteAt < now
 *   2. cancella i Document il cui guest ha booking checkOut < now - retentionDays
 *      (ed elimina anche l'oggetto su S3)
 *   3. logga ogni cancellazione in AuditLog per dimostrare conformità
 *
 * La policy: i documenti d'identità grezzi vivono al massimo 7 giorni dopo il
 * check-out. Gli embedding facciali al massimo 7 giorni dopo il check-out.
 * I dati anagrafici restano (sono stati comunicati alla Polizia per legge,
 * conservati per il termine prescritto).
 */

import type { PrismaClient } from '@prisma/client';
import { audit } from '../audit';

const DEFAULT_DOCUMENT_RETENTION_DAYS = 7;

export interface CleanupResult {
  embeddingsDeleted: number;
  documentsDeleted: number;
  s3Deleted: number;
  errors: string[];
}

export interface CleanupOptions {
  now?: Date;
  documentRetentionDays?: number;
  /** Caller-provided S3 deleter so this module stays decoupled from storage. */
  deleteFromStorage?: (key: string) => Promise<void>;
}

export async function runGdprCleanup(
  prisma: PrismaClient,
  opts: CleanupOptions = {},
): Promise<CleanupResult> {
  const now = opts.now ?? new Date();
  const retentionDays = opts.documentRetentionDays ?? DEFAULT_DOCUMENT_RETENTION_DAYS;
  const result: CleanupResult = {
    embeddingsDeleted: 0,
    documentsDeleted: 0,
    s3Deleted: 0,
    errors: [],
  };

  // 1. Embeddings whose scheduledDeleteAt has passed.
  const expiredEmbeddings = await prisma.faceEmbedding.findMany({
    where: { scheduledDeleteAt: { lt: now } },
    select: { id: true, guestId: true },
  });
  if (expiredEmbeddings.length > 0) {
    await prisma.faceEmbedding.deleteMany({
      where: { id: { in: expiredEmbeddings.map((e) => e.id) } },
    });
    result.embeddingsDeleted = expiredEmbeddings.length;
    for (const e of expiredEmbeddings) {
      try {
        await audit({
          event: 'data.cleanup',
          guestId: e.guestId,
          details: { kind: 'face_embedding' },
        });
      } catch (err) {
        result.errors.push(`audit(embedding ${e.id}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 2. Documents tied to bookings ended > retention days ago.
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const oldDocuments = await prisma.document.findMany({
    where: {
      deletedAt: null,
      guest: { booking: { checkOutDate: { lt: cutoff } } },
    },
    select: { id: true, s3Key: true, guestId: true },
  });
  for (const doc of oldDocuments) {
    try {
      if (opts.deleteFromStorage) {
        await opts.deleteFromStorage(doc.s3Key);
        result.s3Deleted++;
      }
      await prisma.document.update({
        where: { id: doc.id },
        data: { deletedAt: new Date() },
      });
      result.documentsDeleted++;
      try {
        await audit({
          event: 'data.cleanup',
          guestId: doc.guestId,
          details: { kind: 'document', s3Key: doc.s3Key },
        });
      } catch (err) {
        result.errors.push(`audit(document ${doc.id}): ${err instanceof Error ? err.message : String(err)}`);
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return result;
}
