/**
 * GET /api/health
 *
 * Health check per uptime monitoring (BetterStack, Pingdom, Vercel
 * Analytics). Ritorna 200 + `{ ok, db, version }` se DB raggiungibile,
 * 503 altrimenti.
 *
 * Pubblico, non autenticato. Non espone dati sensibili: solo timestamp,
 * stato DB e versione app.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import pkg from '../../../../package.json' with { type: 'json' };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbLatencyMs = -1;

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? 200 : 503;
  return NextResponse.json(
    {
      ok: dbOk,
      db: dbOk ? 'up' : 'down',
      dbLatencyMs,
      version: pkg.version,
      uptimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}
