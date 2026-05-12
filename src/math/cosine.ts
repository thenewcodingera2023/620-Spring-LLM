// Cosine similarity, gradients, ranking, and level-set helpers.
// References: CALCULUS_VISUALIZATION_IMPLEMENTATION_PLAN.md, Section 3 Layer 2 and Section 4.

import type { Vector } from './types';
import { dot, norm, vecScale, vecSub } from './linalg';

/** Below this threshold a vector is treated as zero. */
const ZERO_NORM_TOL = 1e-12;

export class ZeroVectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZeroVectorError';
  }
}

function assertSameDim(q: Vector, d: Vector, op: string): void {
  if (q.length !== d.length) {
    throw new Error(`${op}: dimension mismatch (${q.length} vs ${d.length})`);
  }
}

export function cosineSimilarity(q: Vector, d: Vector): number {
  assertSameDim(q, d, 'cosineSimilarity');
  const qn = norm(q);
  const dn = norm(d);
  if (qn < ZERO_NORM_TOL || dn < ZERO_NORM_TOL) {
    throw new ZeroVectorError('cosineSimilarity: zero-magnitude vector is not allowed');
  }
  return dot(q, d) / (qn * dn);
}

/** Numerically clamps the cosine into [-1, 1] before taking arccos. */
export function angleBetween(q: Vector, d: Vector): number {
  const c = cosineSimilarity(q, d);
  const clamped = c > 1 ? 1 : c < -1 ? -1 : c;
  return Math.acos(clamped);
}

/**
 * Gradient of cos(q, d) with respect to q, "form A" (Section 3, equation L2-7):
 *   grad_q cos(q, d) = d / (||q|| ||d||) - (q . d) q / (||q||^3 ||d||).
 *
 * d is held fixed. Throws if q or d is the zero vector.
 */
export function gradCosWrtQFormA(q: Vector, d: Vector): Vector {
  assertSameDim(q, d, 'gradCosWrtQFormA');
  const qn = norm(q);
  const dn = norm(d);
  if (qn < ZERO_NORM_TOL || dn < ZERO_NORM_TOL) {
    throw new ZeroVectorError('gradCosWrtQFormA: zero-magnitude vector is not allowed');
  }
  const qd = dot(q, d);
  const term1 = vecScale(d, 1 / (qn * dn));
  const term2 = vecScale(q, qd / (qn * qn * qn * dn));
  return vecSub(term1, term2);
}

/**
 * Gradient of cos(q, d) with respect to q, "form B" (Section 3, equation L2-8):
 *   grad_q cos(q, d) = (1 / ||q||) (d / ||d|| - cos(q, d) * q / ||q||).
 *
 * Geometrically, this is the component of d-hat orthogonal to q-hat, scaled by 1 / ||q||.
 * Algebraically equivalent to form A; computed via a different factoring.
 */
export function gradCosWrtQFormB(q: Vector, d: Vector): Vector {
  assertSameDim(q, d, 'gradCosWrtQFormB');
  const qn = norm(q);
  const dn = norm(d);
  if (qn < ZERO_NORM_TOL || dn < ZERO_NORM_TOL) {
    throw new ZeroVectorError('gradCosWrtQFormB: zero-magnitude vector is not allowed');
  }
  const c = dot(q, d) / (qn * dn);
  const dHat = vecScale(d, 1 / dn);
  const qHat = vecScale(q, 1 / qn);
  const inner = vecSub(dHat, vecScale(qHat, c));
  return vecScale(inner, 1 / qn);
}

/** Default gradient w.r.t. q: form A. */
export const gradCosWrtQ = gradCosWrtQFormA;

/**
 * Returns the indices of `documents` ordered by descending cosine similarity to `q`.
 * Stable: ties preserve the input order.
 */
export function rankByCosine(q: Vector, documents: readonly Vector[]): number[] {
  const scored = documents.map((d, i) => ({ i, score: cosineSimilarity(q, d) }));
  scored.sort((a, b) => {
    if (a.score === b.score) return a.i - b.i;
    return b.score - a.score;
  });
  return scored.map((s) => s.i);
}

/** Convenience: returns cosine values aligned to the document array (no sorting). */
export function cosineScores(q: Vector, documents: readonly Vector[]): number[] {
  return documents.map((d) => cosineSimilarity(q, d));
}

/**
 * Level set in 2D: { q : cos(q, d) = c } for c in (-1, 1).
 * Returns two unit vectors u1, u2 such that for any r > 0, cos(r * u_k, d) = c.
 * Geometrically these are the two rays at angles +/- arccos(c) from d.
 */
export function levelSetRays2D(d: Vector, c: number): { ray1: Vector; ray2: Vector } {
  if (d.length !== 2) {
    throw new Error(`levelSetRays2D: expected a 2D vector, got length ${d.length}`);
  }
  if (!(c > -1 && c < 1)) {
    throw new Error(`levelSetRays2D: c must be in the open interval (-1, 1), got ${c}`);
  }
  const dn = norm(d);
  if (dn < ZERO_NORM_TOL) {
    throw new ZeroVectorError('levelSetRays2D: zero-magnitude vector is not allowed');
  }
  const dHat: Vector = [d[0] / dn, d[1] / dn];
  // 2D perpendicular: rotate dHat by +90 degrees.
  const dPerp: Vector = [-dHat[1], dHat[0]];
  const s = Math.sqrt(1 - c * c);
  const ray1: Vector = [c * dHat[0] + s * dPerp[0], c * dHat[1] + s * dPerp[1]];
  const ray2: Vector = [c * dHat[0] - s * dPerp[0], c * dHat[1] - s * dPerp[1]];
  return { ray1, ray2 };
}

/**
 * Sample N unit directions on the cone { u : u . d-hat = c, ||u|| = 1 } in 3D.
 * Returns N unit vectors. For any r > 0 and any returned u, cos(r * u, d) = c.
 *
 * Implementation: pick an arbitrary axis e not parallel to d-hat, build an orthonormal pair
 * (e1, e2) spanning the plane perpendicular to d-hat, then for theta in [0, 2 pi)
 *   u(theta) = c * d-hat + sqrt(1 - c^2) * (cos(theta) * e1 + sin(theta) * e2).
 */
export function levelSetCone3D(d: Vector, c: number, samples: number): Vector[] {
  if (d.length !== 3) {
    throw new Error(`levelSetCone3D: expected a 3D vector, got length ${d.length}`);
  }
  if (!(c > -1 && c < 1)) {
    throw new Error(`levelSetCone3D: c must be in the open interval (-1, 1), got ${c}`);
  }
  if (samples < 3) {
    throw new Error(`levelSetCone3D: samples must be >= 3, got ${samples}`);
  }
  const dn = norm(d);
  if (dn < ZERO_NORM_TOL) {
    throw new ZeroVectorError('levelSetCone3D: zero-magnitude vector is not allowed');
  }
  const dHat: Vector = [d[0] / dn, d[1] / dn, d[2] / dn];
  // Pick an axis least parallel to dHat.
  const ax = Math.abs(dHat[0]);
  const ay = Math.abs(dHat[1]);
  const az = Math.abs(dHat[2]);
  let pick: Vector;
  if (ax <= ay && ax <= az) pick = [1, 0, 0];
  else if (ay <= az) pick = [0, 1, 0];
  else pick = [0, 0, 1];

  // e1 = normalize(pick - (pick . dHat) dHat)
  const proj = pick[0] * dHat[0] + pick[1] * dHat[1] + pick[2] * dHat[2];
  const e1Raw: Vector = [pick[0] - proj * dHat[0], pick[1] - proj * dHat[1], pick[2] - proj * dHat[2]];
  const e1n = Math.sqrt(e1Raw[0] ** 2 + e1Raw[1] ** 2 + e1Raw[2] ** 2);
  const e1: Vector = [e1Raw[0] / e1n, e1Raw[1] / e1n, e1Raw[2] / e1n];
  // e2 = dHat x e1
  const e2: Vector = [
    dHat[1] * e1[2] - dHat[2] * e1[1],
    dHat[2] * e1[0] - dHat[0] * e1[2],
    dHat[0] * e1[1] - dHat[1] * e1[0],
  ];

  const s = Math.sqrt(1 - c * c);
  const out: Vector[] = new Array<Vector>(samples);
  for (let k = 0; k < samples; k++) {
    const theta = (2 * Math.PI * k) / samples;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    out[k] = [
      c * dHat[0] + s * (ct * e1[0] + st * e2[0]),
      c * dHat[1] + s * (ct * e1[1] + st * e2[1]),
      c * dHat[2] + s * (ct * e1[2] + st * e2[2]),
    ];
  }
  return out;
}
