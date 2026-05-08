import { describe, it, expect, beforeEach } from 'vitest';
import { runGdprCleanup } from '@/lib/gdpr/cleanup';

// Lightweight Prisma mock.
type FaceEmbeddingRow = { id: string; guestId: string; scheduledDeleteAt: Date };
type DocumentRow = {
  id: string;
  s3Key: string;
  guestId: string;
  deletedAt: Date | null;
  guest: { booking: { checkOutDate: Date } };
};

function buildMock(state: { embeddings: FaceEmbeddingRow[]; documents: DocumentRow[] }) {
  return {
    faceEmbedding: {
      findMany: async ({ where }: { where: { scheduledDeleteAt: { lt: Date } } }) =>
        state.embeddings.filter((e) => e.scheduledDeleteAt < where.scheduledDeleteAt.lt),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        const before = state.embeddings.length;
        state.embeddings = state.embeddings.filter((e) => !where.id.in.includes(e.id));
        return { count: before - state.embeddings.length };
      },
    },
    document: {
      findMany: async ({ where }: { where: { deletedAt: null; guest: { booking: { checkOutDate: { lt: Date } } } } }) =>
        state.documents.filter(
          (d) => d.deletedAt === null && d.guest.booking.checkOutDate < where.guest.booking.checkOutDate.lt,
        ),
      update: async ({ where, data }: { where: { id: string }; data: { deletedAt: Date } }) => {
        const doc = state.documents.find((d) => d.id === where.id);
        if (doc) doc.deletedAt = data.deletedAt;
      },
    },
    auditLog: {
      create: async () => ({}),
    },
  } as unknown as Parameters<typeof runGdprCleanup>[0];
}

describe('runGdprCleanup', () => {
  let now: Date;
  beforeEach(() => {
    now = new Date('2026-06-15T03:00:00Z');
  });

  it('deletes embeddings whose scheduledDeleteAt has passed', async () => {
    const state = {
      embeddings: [
        { id: 'e1', guestId: 'g1', scheduledDeleteAt: new Date('2026-06-01') }, // old
        { id: 'e2', guestId: 'g2', scheduledDeleteAt: new Date('2026-07-01') }, // future
      ],
      documents: [],
    };
    const prisma = buildMock(state);
    const result = await runGdprCleanup(prisma, { now });
    expect(result.embeddingsDeleted).toBe(1);
    expect(state.embeddings.map((e) => e.id)).toEqual(['e2']);
  });

  it('deletes documents past the retention window and calls storage', async () => {
    const state = {
      embeddings: [],
      documents: [
        {
          id: 'd1',
          s3Key: 'k1',
          guestId: 'g1',
          deletedAt: null,
          guest: { booking: { checkOutDate: new Date('2026-06-01') } }, // 14 days old
        },
        {
          id: 'd2',
          s3Key: 'k2',
          guestId: 'g2',
          deletedAt: null,
          guest: { booking: { checkOutDate: new Date('2026-06-12') } }, // 3 days old
        },
      ],
    };
    const deleted: string[] = [];
    const prisma = buildMock(state);
    const result = await runGdprCleanup(prisma, {
      now,
      documentRetentionDays: 7,
      deleteFromStorage: async (k) => {
        deleted.push(k);
      },
    });
    expect(result.documentsDeleted).toBe(1);
    expect(result.s3Deleted).toBe(1);
    expect(deleted).toEqual(['k1']);
  });

  it('continues on per-document storage errors and reports them', async () => {
    const state = {
      embeddings: [],
      documents: [
        {
          id: 'd1',
          s3Key: 'k1',
          guestId: 'g1',
          deletedAt: null,
          guest: { booking: { checkOutDate: new Date('2026-06-01') } },
        },
      ],
    };
    const prisma = buildMock(state);
    const result = await runGdprCleanup(prisma, {
      now,
      deleteFromStorage: async () => {
        throw new Error('S3 unreachable');
      },
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('S3 unreachable');
  });
});
