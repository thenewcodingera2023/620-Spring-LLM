import { describe, expect, it } from 'vitest';
import {
  ZeroVectorError,
  angleBetween,
  cosineScores,
  cosineSimilarity,
  gradCosWrtQFormA,
  gradCosWrtQFormB,
} from '../math/cosine';
import { gradFD } from '../math/finiteDifference';
import { dot, norm, vecScale } from '../math/linalg';
import { sampleDocuments, sampleQuery } from '../data/sampleDocuments';
import type { Vector } from '../math/types';

const TOL_EXACT = 1e-12;
const TOL_FD = 1e-4;

// Deterministic PRNG so the "random" tests are reproducible across runs.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function rand(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomNonzero(rand: () => number, n: number): Vector {
  // Reject vectors with very small norm to avoid the q = 0 singularity.
  while (true) {
    const v = new Array<number>(n);
    for (let i = 0; i < n; i++) v[i] = (rand() - 0.5) * 4; // values in roughly (-2, 2)
    if (norm(v) > 0.1) return v;
  }
}

describe('cosine similarity values', () => {
  it('returns 1 for parallel, -1 for antiparallel, 0 for perpendicular', () => {
    expect(cosineSimilarity([1, 0], [3, 0])).toBeCloseTo(1, 12);
    expect(cosineSimilarity([1, 0], [-2, 0])).toBeCloseTo(-1, 12);
    expect(cosineSimilarity([1, 0], [0, 7])).toBeCloseTo(0, 12);
    expect(cosineSimilarity([1, 1], [1, -1])).toBeCloseTo(0, 12);
  });

  it('is invariant under positive scaling of either argument', () => {
    const q = [0.7, -1.2];
    const d = [2.1, 0.4];
    const c0 = cosineSimilarity(q, d);
    expect(cosineSimilarity(vecScale(q, 5), d)).toBeCloseTo(c0, 12);
    expect(cosineSimilarity(q, vecScale(d, 0.01))).toBeCloseTo(c0, 12);
  });

  it('throws ZeroVectorError on a zero argument', () => {
    expect(() => cosineSimilarity([0, 0], [1, 1])).toThrow(ZeroVectorError);
    expect(() => cosineSimilarity([1, 1], [0, 0, 0].slice(0, 2))).toThrow(ZeroVectorError);
  });

  it('rejects dimension mismatches', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(/dimension mismatch/);
  });
});

describe('cosine bounds for random nonzero pairs', () => {
  it('stays inside [-1, 1] within numeric tolerance over many R^2 and R^3 samples', () => {
    const rand = mulberry32(0xc0ffee);
    for (let trial = 0; trial < 1000; trial++) {
      const dim = trial % 2 === 0 ? 2 : 3;
      const q = randomNonzero(rand, dim);
      const d = randomNonzero(rand, dim);
      const c = cosineSimilarity(q, d);
      expect(c).toBeGreaterThanOrEqual(-1 - 1e-12);
      expect(c).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
});

describe('angleBetween', () => {
  it('is consistent with cos and clamps near +/- 1', () => {
    expect(angleBetween([1, 0], [1, 0])).toBeCloseTo(0, 12);
    expect(angleBetween([1, 0], [-1, 0])).toBeCloseTo(Math.PI, 12);
    expect(angleBetween([1, 0], [0, 1])).toBeCloseTo(Math.PI / 2, 12);
  });
});

describe('gradient of cosine wrt q', () => {
  it('forms A and B agree numerically on random inputs', () => {
    const rand = mulberry32(0xb00bee);
    for (let trial = 0; trial < 200; trial++) {
      const dim = trial % 2 === 0 ? 2 : 3;
      const q = randomNonzero(rand, dim);
      const d = randomNonzero(rand, dim);
      const a = gradCosWrtQFormA(q, d);
      const b = gradCosWrtQFormB(q, d);
      for (let i = 0; i < dim; i++) {
        expect(Math.abs(a[i] - b[i])).toBeLessThan(TOL_EXACT);
      }
    }
  });

  it('passes a finite-difference check', () => {
    const rand = mulberry32(42);
    for (let trial = 0; trial < 25; trial++) {
      const dim = trial % 2 === 0 ? 2 : 3;
      const q = randomNonzero(rand, dim);
      const d = randomNonzero(rand, dim);
      const analytic = gradCosWrtQFormA(q, d);
      const numeric = gradFD((qi) => cosineSimilarity(qi, d), q);
      for (let i = 0; i < dim; i++) {
        expect(Math.abs(analytic[i] - numeric[i])).toBeLessThan(TOL_FD);
      }
    }
  });

  it('throws ZeroVectorError on a zero argument', () => {
    expect(() => gradCosWrtQFormA([0, 0], [1, 1])).toThrow(ZeroVectorError);
    expect(() => gradCosWrtQFormB([0, 0], [1, 1])).toThrow(ZeroVectorError);
  });
});

describe('cosine as directional derivative (Section 3, L2-5)', () => {
  // f(x) = u . x with u = q / ||q|| held fixed. Then D_v f = u . v at any point.
  // Setting q = a*u, d = b*v with a, b > 0 gives D_{d/||d||} f = u . v = cos(q, d).
  it('matches u . v exactly for random unit u, v and random positive scalings', () => {
    const rand = mulberry32(7);
    for (let trial = 0; trial < 100; trial++) {
      const dim = trial % 2 === 0 ? 2 : 3;
      const uRaw = randomNonzero(rand, dim);
      const vRaw = randomNonzero(rand, dim);
      const u = vecScale(uRaw, 1 / norm(uRaw));
      const v = vecScale(vRaw, 1 / norm(vRaw));
      const a = 0.1 + rand() * 3;
      const b = 0.1 + rand() * 3;
      const q = vecScale(u, a);
      const d = vecScale(v, b);

      // The directional derivative of the linear f(x) = u . x in the unit direction v is u . v.
      const directionalDerivative = dot(u, v);
      const cos = cosineSimilarity(q, d);
      expect(Math.abs(directionalDerivative - cos)).toBeLessThan(TOL_EXACT);
    }
  });
});

describe('cosineScores convenience', () => {
  it('aligns with the document order (no sorting)', () => {
    const scores = cosineScores(sampleQuery, sampleDocuments);
    expect(scores).toHaveLength(sampleDocuments.length);
    for (let i = 0; i < scores.length; i++) {
      expect(scores[i]).toBeCloseTo(cosineSimilarity(sampleQuery, sampleDocuments[i]), 12);
    }
  });
});
