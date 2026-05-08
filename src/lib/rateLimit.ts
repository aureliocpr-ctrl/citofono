/**
 * Rate limiter token-bucket in-memory.
 *
 * Funziona benissimo su una singola istanza Node (Vercel può schedularne più
 * di una). Per produzione multi-istanza si swappa con un backend condiviso
 * (Upstash Redis, Cloudflare KV) cambiando solo l'implementazione di
 * `RateLimitStore`. L'API pubblica (`enforce`) resta invariata.
 *
 * Dimensionamento:
 *   - signup/login:     5 tentativi / 5 min per IP
 *   - guest endpoints:  30 richieste / min per token (l'ospite carica foto
 *     più volte durante il flusso, deve avere margine)
 *   - concierge:        20 messaggi / 5 min per token
 */

import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  /** Numero massimo di richieste nel periodo `windowMs`. */
  max: number;
  /** Finestra in millisecondi. */
  windowMs: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  hit(key: string, cfg: RateLimitConfig): { allowed: boolean; remaining: number; retryAfterSec: number };
}

class InMemoryStore implements RateLimitStore {
  private buckets = new Map<string, BucketEntry>();

  hit(key: string, cfg: RateLimitConfig) {
    const now = Date.now();
    const entry = this.buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      const next = { count: 1, resetAt: now + cfg.windowMs };
      this.buckets.set(key, next);
      // Soft GC: ogni 1000 ingressi puliamo i bucket scaduti.
      if (this.buckets.size > 1000) this.gc(now);
      return { allowed: true, remaining: cfg.max - 1, retryAfterSec: 0 };
    }

    if (entry.count >= cfg.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: cfg.max - entry.count,
      retryAfterSec: 0,
    };
  }

  private gc(now: number) {
    for (const [key, entry] of this.buckets) {
      if (entry.resetAt <= now) this.buckets.delete(key);
    }
  }
}

const store: RateLimitStore = new InMemoryStore();

export function clientIp(req: NextRequest | { headers: Headers }): string {
  const headers = 'headers' in req ? req.headers : new Headers();
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Applica il rate limit. Se la richiesta è oltre soglia restituisce una
 * `NextResponse` 429 da returnare direttamente; altrimenti `null` e si
 * continua il processing.
 */
export function enforce(
  req: NextRequest | { headers: Headers },
  bucketKey: string,
  cfg: RateLimitConfig,
): NextResponse | null {
  const ip = clientIp(req);
  const key = `${bucketKey}:${ip}`;
  const result = store.hit(key, cfg);

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: result.retryAfterSec },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSec),
          'X-RateLimit-Limit': String(cfg.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000 + result.retryAfterSec)),
        },
      },
    );
  }
  return null;
}

/**
 * Variante per server actions / pagine non-route. Ritorna `null` se ok,
 * altrimenti throw un Error con messaggio i18n-pronto. Il chiamante
 * intercetta e rende lo stato come preferisce.
 */
export function enforceForAction(
  headers: Headers,
  bucketKey: string,
  cfg: RateLimitConfig,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const ip = clientIp({ headers });
  const result = store.hit(`${bucketKey}:${ip}`, cfg);
  return result.allowed ? { allowed: true } : { allowed: false, retryAfterSec: result.retryAfterSec };
}

// Profili predefiniti.
export const RL = {
  AUTH: { max: 5, windowMs: 5 * 60_000 },
  GUEST_GENERIC: { max: 30, windowMs: 60_000 },
  CONCIERGE: { max: 20, windowMs: 5 * 60_000 },
  WEBHOOK: { max: 100, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;
