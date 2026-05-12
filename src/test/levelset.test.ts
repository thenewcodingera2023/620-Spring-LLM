import { describe, expect, it } from 'vitest';
import { cosineSimilarity, levelSetCone3D, levelSetRays2D } from '../math/cosine';
import { norm, vecScale } from '../math/linalg';
import type { Vector } from '../math/types';

const TOL = 1e-10;

describe('levelSetRays2D', () => {
  it('returns two unit vectors u1, u2 such that cos(r * u_k, d) = c for any r > 0', () => {
    const d: Vector = [2, 1];
    const c = 0.6;
    const { ray1, ray2 } = levelSetRays2D(d, c);

    expect(norm(ray1)).toBeCloseTo(1, 12);
    expect(norm(ray2)).toBeCloseTo(1, 12);

    for (const r of [0.1, 1, 5, 17.5]) {
      expect(Math.abs(cosineSimilarity(vecScale(ray1, r), d) - c)).toBeLessThan(TOL);
      expect(Math.abs(cosineSimilarity(vecScale(ray2, r), d) - c)).toBeLessThan(TOL);
    }
  });

  it('produces two distinct rays for c not equal to 1', () => {
    const d: Vector = [1, 0];
    const { ray1, ray2 } = levelSetRays2D(d, 0.3);
    const dx = ray1[0] - ray2[0];
    const dy = ray1[1] - ray2[1];
    expect(Math.hypot(dx, dy)).toBeGreaterThan(0.1);
  });

  it('handles negative c (symmetric pair on the far side of d)', () => {
    const d: Vector = [1, 0];
    const c = -0.4;
    const { ray1, ray2 } = levelSetRays2D(d, c);
    expect(Math.abs(cosineSimilarity(ray1, d) - c)).toBeLessThan(TOL);
    expect(Math.abs(cosineSimilarity(ray2, d) - c)).toBeLessThan(TOL);
  });

  it('rejects c = 1 or c = -1 (degenerate level set)', () => {
    const d: Vector = [1, 0];
    expect(() => levelSetRays2D(d, 1)).toThrow();
    expect(() => levelSetRays2D(d, -1)).toThrow();
    expect(() => levelSetRays2D(d, 1.5)).toThrow();
  });

  it('rejects non-2D inputs and the zero vector', () => {
    expect(() => levelSetRays2D([1, 0, 0], 0.3)).toThrow();
    expect(() => levelSetRays2D([0, 0], 0.3)).toThrow();
  });

  it('numerically verifies the parametric ray q = r (cos(arccos(c)) d_hat + sin(arccos(c)) d_perp)', () => {
    // Section 4 item 12 reference parametrization.
    const d: Vector = [3, 4];
    const c = 0.25;
    const dn = norm(d);
    const dHat: Vector = [d[0] / dn, d[1] / dn];
    const dPerp: Vector = [-dHat[1], dHat[0]];
    const theta = Math.acos(c);
    for (let i = 0; i < 100; i++) {
      const r = 0.1 + i * 0.05;
      const q: Vector = [
        r * (Math.cos(theta) * dHat[0] + Math.sin(theta) * dPerp[0]),
        r * (Math.cos(theta) * dHat[1] + Math.sin(theta) * dPerp[1]),
      ];
      expect(Math.abs(cosineSimilarity(q, d) - c)).toBeLessThan(TOL);
    }
  });
});

describe('levelSetCone3D (optional)', () => {
  it('returns unit directions on the cone u . d_hat = c', () => {
    const d: Vector = [1, 2, -1];
    const c = 0.4;
    const samples = 32;
    const directions = levelSetCone3D(d, c, samples);
    expect(directions).toHaveLength(samples);
    for (const u of directions) {
      expect(norm(u)).toBeCloseTo(1, 12);
      // At r = 1 (or any positive r), cos(u, d) = c.
      expect(Math.abs(cosineSimilarity(u, d) - c)).toBeLessThan(TOL);
      expect(Math.abs(cosineSimilarity(vecScale(u, 4.2), d) - c)).toBeLessThan(TOL);
    }
  });

  it('rejects non-3D inputs, c at the boundary, and small sample counts', () => {
    expect(() => levelSetCone3D([1, 0], 0.5, 32)).toThrow();
    expect(() => levelSetCone3D([1, 0, 0], 1, 32)).toThrow();
    expect(() => levelSetCone3D([1, 0, 0], 0.5, 2)).toThrow();
    expect(() => levelSetCone3D([0, 0, 0], 0.5, 32)).toThrow();
  });
});
