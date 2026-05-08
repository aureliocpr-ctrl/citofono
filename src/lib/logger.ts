/**
 * Logger strutturato JSON.
 *
 * Output stdout in JSON così Vercel/Datadog/Logtail possono indicizzare i
 * campi. Niente dipendenze (no winston/pino/bunyan): un piccolo formatter
 * basta. Quando aggiungeremo Sentry, l'unico hook da implementare è
 * `captureError` qui sotto.
 *
 * Uso:
 *   import { log } from '@/lib/logger';
 *   log.info('booking.created', { bookingId, hostId });
 *   log.warn('ical.parse_failed', { url, error });
 *   log.error('payment.failed', err, { hostId, plan });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [k: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'hashedPassword',
  'token',
  'sessionId',
  'apiKey',
  'authorization',
  'cookie',
  'embedding',
  'face',
  'faceEmbedding',
  'docNumber',
  'birthDate',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function emit(level: LogLevel, event: string, context?: LogContext, err?: unknown) {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
  };
  if (context) Object.assign(payload, redact(context) as Record<string, unknown>);
  if (err) payload.error = redact(err);

  const line = JSON.stringify(payload);
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }

  // Hook per Sentry / external sink: in produzione, se SENTRY_DSN è
  // impostato, qui faremo `Sentry.captureException`. Stub per ora.
  if (level === 'error' && err && process.env.SENTRY_DSN) {
    // captureSentry(event, err, context);
  }
}

export const log = {
  debug: (event: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'production') return;
    emit('debug', event, context);
  },
  info: (event: string, context?: LogContext) => emit('info', event, context),
  warn: (event: string, context?: LogContext) => emit('warn', event, context),
  error: (event: string, err: unknown, context?: LogContext) =>
    emit('error', event, context, err),
};
