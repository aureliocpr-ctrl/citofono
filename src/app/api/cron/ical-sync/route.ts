/**
 * GET /api/cron/ical-sync
 *
 * Cron Vercel ogni 30 minuti. Sincronizza i calendari iCal di tutte le
 * Property con URL configurati. Idempotente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncAllProperties } from '@/lib/ical/runner';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
  const result = await syncAllProperties(prisma);
  return NextResponse.json({ ok: true, ...result });
}
