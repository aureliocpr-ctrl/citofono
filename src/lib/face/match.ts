/**
 * Face match: confronto fra l'embedding estratto dal selfie dell'ospite e
 * quello estratto dalla foto del documento.
 *
 * Strategia:
 *   - Gli embedding (vettori 128-dim) vengono calcolati nel browser via
 *     face-api.js durante il flusso check-in (riduce dati biometrici inviati
 *     al server: la foto resta lato client il più possibile, il server riceve
 *     solo gli embedding numerici già estratti).
 *   - Server-side qui calcoliamo la similarità coseno fra i due vettori,
 *     applichiamo la soglia di accettazione, e decidiamo se la verifica
 *     passa, va a review umana, o viene rigettata.
 *
 * Dimensione embedding: 128 (FaceNet / ResNet-34 distillato in face-api.js).
 * Tipo: Float32Array → in DB salviamo come Bytes (512 byte).
 */

/** Soglia di accettazione automatica. Sopra → match certificato. */
export const MATCH_THRESHOLD_ACCEPT = 0.65;

/** Soglia di review. Tra REVIEW e ACCEPT serve approvazione manuale host. */
export const MATCH_THRESHOLD_REVIEW = 0.50;

export type MatchVerdict = 'match' | 'review' | 'reject';

export interface MatchResult {
  similarity: number; // 0..1 (1 = identico, 0 = ortogonale)
  distance: number; // distanza euclidea, indicativa
  verdict: MatchVerdict;
  reason?: string;
}

/** Cosine similarity in [-1, 1]; per embedding L2-normalizzati ∈ [0, 1]. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`embedding length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`embedding length mismatch: ${a.length} vs ${b.length}`);
  }
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    const d = va - vb;
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Decisione finale: match / review / reject. */
export function matchEmbeddings(selfie: Float32Array, doc: Float32Array): MatchResult {
  const similarity = cosineSimilarity(selfie, doc);
  const distance = euclideanDistance(selfie, doc);

  let verdict: MatchVerdict;
  let reason: string | undefined;
  if (similarity >= MATCH_THRESHOLD_ACCEPT) {
    verdict = 'match';
  } else if (similarity >= MATCH_THRESHOLD_REVIEW) {
    verdict = 'review';
    reason = `similarity ${similarity.toFixed(3)} between review (${MATCH_THRESHOLD_REVIEW}) and accept (${MATCH_THRESHOLD_ACCEPT}) thresholds`;
  } else {
    verdict = 'reject';
    reason = `similarity ${similarity.toFixed(3)} below review threshold ${MATCH_THRESHOLD_REVIEW}`;
  }
  return { similarity, distance, verdict, reason };
}

// ─────────── Serializzazione ───────────
//
// Il DB salva l'embedding come Bytes per compattezza e per non avere
// rappresentazioni numeriche imprecise. 128 float × 4 byte = 512 byte.

export function encodeEmbedding(embedding: Float32Array): Buffer {
  const buf = Buffer.alloc(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buf.writeFloatLE(embedding[i] ?? 0, i * 4);
  }
  return buf;
}

export function decodeEmbedding(buf: Buffer): Float32Array {
  const out = new Float32Array(buf.length / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = buf.readFloatLE(i * 4);
  }
  return out;
}
