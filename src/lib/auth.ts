/**
 * Auth wrapper su Lucia v3.
 *
 * Sessioni cookie, no JWT. Logout invalidando la sessione lato server.
 * Password con argon2id (memory-hard, resistente a rainbow tables).
 */

import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { cookies } from 'next/headers';
import { cache } from 'react';
import argon2 from 'argon2';

import { prisma } from './db';

const adapter = new PrismaAdapter(prisma.session, prisma.host);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: 'citofono_session',
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    fullName: attributes.fullName,
    plan: attributes.plan,
  }),
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      fullName: string;
      plan: string;
    };
  }
}

/**
 * Validate request session. Returns { user, session } or { user: null, session: null }.
 * Uses React cache so it's only computed once per request.
 */
export const validateRequest = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return { user: null, session: null };
  }
  const result = await lucia.validateSession(sessionId);
  // Refresh cookie on rolling sessions
  try {
    if (result.session && result.session.fresh) {
      const cookie = lucia.createSessionCookie(result.session.id);
      cookieStore.set(cookie.name, cookie.value, cookie.attributes);
    }
    if (!result.session) {
      const cookie = lucia.createBlankSessionCookie();
      cookieStore.set(cookie.name, cookie.value, cookie.attributes);
    }
  } catch {
    // Next.js may not allow cookie writes in some contexts (e.g. Server Components);
    // safe to ignore — the cookie will get refreshed on next mutation.
  }
  return result;
});

const ARGON_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Lazy reference hash used for "constant-time" failed-login responses.
 * Without it, an attacker could measure response time to discover whether
 * an email exists in our DB.
 *
 * Computed once on first call and cached.
 */
let cachedDummyHash: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  if (!cachedDummyHash) {
    cachedDummyHash = argon2.hash(
      '__citofono_dummy_pwd_for_constant_time_compare__',
      ARGON_OPTS,
    );
  }
  return cachedDummyHash;
}

/** Synchronous-style getter for callers that already awaited it once. */
export const DUMMY_HASH_PROMISE = dummyHash();
