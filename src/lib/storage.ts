/**
 * Storage astratto: S3-compatible (Cloudflare R2 in produzione, MinIO o
 * filesystem locale in sviluppo).
 *
 * Privacy: ogni oggetto ha un TTL via tagging — l'object lifecycle del bucket
 * elimina file più vecchi di N giorni. In sviluppo simuliamo via mtime.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const useS3 =
  Boolean(process.env.S3_ACCESS_KEY) &&
  Boolean(process.env.S3_SECRET_KEY) &&
  Boolean(process.env.S3_BUCKET) &&
  Boolean(process.env.S3_ENDPOINT);

const localRoot = join(process.cwd(), 'uploads');

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION ?? 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export interface PutOpts {
  /** Tag the object with a TTL category. Bucket lifecycle handles deletion. */
  ttlCategory?: 'short' | 'verification' | 'long';
}

export async function putObject(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
  opts: PutOpts = {},
): Promise<void> {
  if (!useS3) {
    const path = join(localRoot, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return;
  }
  const tagging = opts.ttlCategory ? `ttl=${opts.ttlCategory}` : undefined;
  await s3().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      Tagging: tagging,
    }),
  );
}

export async function getObject(key: string): Promise<Buffer> {
  if (!useS3) {
    const path = join(localRoot, key);
    if (!existsSync(path)) throw new Error(`storage: object not found: ${key}`);
    return readFile(path);
  }
  const out = await s3().send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
  );
  if (!out.Body) throw new Error(`storage: empty body for ${key}`);
  // The SDK gives a stream; collect it.
  const chunks: Uint8Array[] = [];
  // @ts-expect-error - Node.js Readable stream from SDK
  for await (const chunk of out.Body) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
  if (!useS3) {
    const path = join(localRoot, key);
    if (existsSync(path)) await unlink(path);
    return;
  }
  await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}

/** Build a deterministic key for a guest's document upload. */
export function documentKey(bookingId: string, guestId: string, side: 'front' | 'back', ext: string): string {
  return `bookings/${bookingId}/guests/${guestId}/doc-${side}.${ext}`;
}

/** Build a deterministic key for a guest's selfie. */
export function selfieKey(bookingId: string, guestId: string, ext: string): string {
  return `bookings/${bookingId}/guests/${guestId}/selfie.${ext}`;
}
