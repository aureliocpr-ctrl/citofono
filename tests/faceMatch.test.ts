import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  euclideanDistance,
  matchEmbeddings,
  encodeEmbedding,
  decodeEmbedding,
  MATCH_THRESHOLD_ACCEPT,
  MATCH_THRESHOLD_REVIEW,
} from '@/lib/face/match';

function unit(arr: number[]): Float32Array {
  let n = 0;
  for (const x of arr) n += x * x;
  n = Math.sqrt(n) || 1;
  return new Float32Array(arr.map((x) => x / n));
}

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    const v = unit([1, 2, 3, 4]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });
  it('is 0 for orthogonal vectors', () => {
    const a = unit([1, 0]);
    const b = unit([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 6);
  });
  it('throws on length mismatch', () => {
    expect(() => cosineSimilarity(new Float32Array([1, 2]), new Float32Array([1]))).toThrow();
  });
});

describe('euclideanDistance', () => {
  it('is 0 for identical vectors', () => {
    const v = new Float32Array([1, 2, 3]);
    expect(euclideanDistance(v, v)).toBeCloseTo(0, 6);
  });
  it('is sqrt(3) for unit-difference per component', () => {
    expect(
      euclideanDistance(new Float32Array([0, 0, 0]), new Float32Array([1, 1, 1])),
    ).toBeCloseTo(Math.sqrt(3), 6);
  });
});

describe('matchEmbeddings', () => {
  const make = (vals: number[]) => unit(vals.concat(Array(128 - vals.length).fill(0)));

  it('verdict=match for identical embeddings', () => {
    const v = make([1, 2, 3]);
    const r = matchEmbeddings(v, v);
    expect(r.verdict).toBe('match');
    expect(r.similarity).toBeGreaterThanOrEqual(MATCH_THRESHOLD_ACCEPT);
  });
  it('verdict=reject for orthogonal embeddings', () => {
    const a = make([1, 0, 0]);
    const b = make([0, 0, 1]);
    const r = matchEmbeddings(a, b);
    expect(r.verdict).toBe('reject');
    expect(r.similarity).toBeLessThan(MATCH_THRESHOLD_REVIEW);
  });
  it('verdict=review for mid-similarity embeddings', () => {
    // Construct vectors with cosine ~ 0.55
    const a = make([1, 0]);
    const b = make([1, 1.5]);
    const r = matchEmbeddings(a, b);
    expect(r.verdict).toBe('review');
  });
});

describe('embedding serialization', () => {
  it('round-trips through encode/decode', () => {
    const vals = new Array(128).fill(0).map((_, i) => Math.sin(i / 7));
    const v = unit(vals);
    const buf = encodeEmbedding(v);
    expect(buf.length).toBe(512);
    const back = decodeEmbedding(buf);
    expect(back.length).toBe(128);
    for (let i = 0; i < 128; i++) {
      expect(back[i]).toBeCloseTo(v[i] ?? 0, 5);
    }
  });
});
