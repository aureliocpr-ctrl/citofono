/**
 * GET /api/cron/gdpr-cleanup
 *
 * Cron Vercel: gira ogni notte. Cancella embedding scaduti e documenti
 * d'identità più vecchi di 7 giorni dal check-out.
 *
 * Autenticazione: header Authorization: Bearer <CRON_SECRET>. Vercel Cron
 * lo invia automaticamente se hai impostato CRON_SECRET nel progetto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deleteObject } from '@/lib/storage';
import { runGdprCleanup } from '@/lib/gdpr/cleanup';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' && !expected) {
    return NextResponse.json({ error: 'cron_secret_required' }, { status: 500 });
  }
  if (expected) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  const result = await runGdprCleanup(prisma, {
    deleteFromStorage: deleteObject,
  });
  return NextResponse.json({ ok: true, ...result });
}
