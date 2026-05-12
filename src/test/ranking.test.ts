import { describe, expect, it } from 'vitest';
import { cosineSimilarity, rankByCosine } from '../math/cosine';
import { sampleDocumentAnglesDeg, sampleDocuments } from '../data/sampleDocuments';
import type { Vector } from '../math/types';

function unitFromAngleDeg(deg: number): Vector {
  const t = (deg * Math.PI) / 180;
  return [Math.cos(t), Math.sin(t)];
}

describe('rankByCosine on the locked four-document example', () => {
  it('orders documents 0, 1, 2, 3 for the initial query [1, 0]', () => {
    // d_0 at 0 deg has cos = 1; d_1 at 60 deg has cos = 0.5; d_2 at 135 deg has cos approx -0.707;
    // d_3 at 220 deg has cos approx -0.766. Magnitudes do not affect the ranking.
    const ranking = rankByCosine([1, 0], sampleDocuments);
    expect(ranking).toEqual([0, 1, 2, 3]);
  });

  it('is invariant under positive scaling of the query', () => {
    const scaled: Vector = [2.5, 0];
    expect(rankByCosine(scaled, sampleDocuments)).toEqual([0, 1, 2, 3]);
  });

  it('changes the top-1 in the expected angular order as the query rotates through 2 pi', () => {
    // The four documents are at 0, 60, 135, 220 degrees. The Voronoi boundaries on the unit
    // circle (in cosine sense) sit at the angle midpoints: 30, 97.5, 177.5, 290 degrees.
    // As q rotates ccw from 0 to 2 pi, top-1 should pass through the documents in angular order
    // 0 -> 1 -> 2 -> 3 -> 0.
    const expectedSequence = [0, 1, 2, 3, 0];
    const seen: number[] = [];
    const N = 720;
    for (let k = 0; k < N; k++) {
      const deg = (k * 360) / N;
      const q = unitFromAngleDeg(deg);
      const top = rankByCosine(q, sampleDocuments)[0];
      if (seen.length === 0 || seen[seen.length - 1] !== top) {
        seen.push(top);
      }
    }
    expect(seen).toEqual(expectedSequence);
  });

  it('returns a permutation of all document indices', () => {
    const ranking = rankByCosine([1, 0], sampleDocuments);
    const sorted = ranking.slice().sort((a, b) => a - b);
    expect(sorted).toEqual(sampleDocuments.map((_, i) => i));
  });

  it('top-1 always has the highest cosine value', () => {
    const queries: Vector[] = [
      [1, 0],
      [0, 1],
      [-1, 1],
      [0.3, -0.9],
    ];
    for (const q of queries) {
      const ranking = rankByCosine(q, sampleDocuments);
      const topScore = cosineSimilarity(q, sampleDocuments[ranking[0]]);
      for (let i = 1; i < ranking.length; i++) {
        const otherScore = cosineSimilarity(q, sampleDocuments[ranking[i]]);
        expect(topScore + 1e-12).toBeGreaterThanOrEqual(otherScore);
      }
    }
  });

  it('document ordering matches the angle ordering when the query is a hand-picked direction', () => {
    // For q at 80 degrees (between 60 and 97.5), top-1 should be d_1 (at 60 deg).
    const q = unitFromAngleDeg(80);
    const ranking = rankByCosine(q, sampleDocuments);
    expect(ranking[0]).toBe(1);

    // For q at 200 degrees (between 177.5 and 290), top-1 should be d_3 (at 220 deg).
    const q2 = unitFromAngleDeg(200);
    expect(rankByCosine(q2, sampleDocuments)[0]).toBe(3);
  });

  it('uses fixed sample documents whose magnitudes vary (proving direction-only ranking)', () => {
    // Sanity guard: ensure the fixture itself includes at least one document with a different
    // magnitude. Without this, the angular-order test above would silently weaken.
    const magnitudes = sampleDocuments.map((d) => Math.hypot(d[0], d[1]));
    const distinct = new Set(magnitudes.map((m) => m.toFixed(6)));
    expect(distinct.size).toBeGreaterThan(1);
    expect(sampleDocumentAnglesDeg.length).toBe(sampleDocuments.length);
  });
});
