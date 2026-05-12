// Forward and backward pass for a small feedforward network.
// Conventions (locked in CALCULUS_VISUALIZATION_IMPLEMENTATION_PLAN.md, Sections 3 and 4):
//   h_0 = x
//   z_l = W_l h_{l-1} + b_l
//   h_l = sigma_l(z_l), with the output layer using identity
//   y_hat = h_L
//   L = 1/2 ||y_hat - y||^2
//   sigma'(0) = 0 for ReLU (subgradient choice)

import type { BackwardResult, ForwardResult, NetworkSpec, Vector } from './types';
import { dot, hadamard, matvec, outer, transpose, vecSub, zerosMatrix, zerosVector } from './linalg';

export function relu(z: number): number {
  return z > 0 ? z : 0;
}

/** ReLU subgradient with the locked convention sigma'(0) = 0. */
export function reluPrime(z: number): number {
  return z > 0 ? 1 : 0;
}

function applyActivation(z: Vector, kind: 'relu' | 'identity'): Vector {
  if (kind === 'identity') return z.slice();
  const out = new Array<number>(z.length);
  for (let i = 0; i < z.length; i++) out[i] = relu(z[i]);
  return out;
}

function activationPrimeVector(z: Vector, kind: 'relu' | 'identity'): Vector {
  if (kind === 'identity') return new Array<number>(z.length).fill(1);
  const out = new Array<number>(z.length);
  for (let i = 0; i < z.length; i++) out[i] = reluPrime(z[i]);
  return out;
}

function assertSpecConsistency(spec: NetworkSpec, x: Vector): void {
  if (spec.layers.length === 0) {
    throw new Error('forward: NetworkSpec must have at least one layer');
  }
  let inDim = x.length;
  for (let l = 0; l < spec.layers.length; l++) {
    const { W, b } = spec.layers[l];
    const rows = W.length;
    if (rows === 0) throw new Error(`forward: layer ${l} W has zero rows`);
    const cols = W[0].length;
    if (cols !== inDim) {
      throw new Error(`forward: layer ${l} W has shape (${rows}, ${cols}) but expected (?, ${inDim})`);
    }
    if (b.length !== rows) {
      throw new Error(`forward: layer ${l} b has length ${b.length} but W has ${rows} rows`);
    }
    inDim = rows;
  }
}

export function mseLoss(yHat: Vector, y: Vector): number {
  const diff = vecSub(yHat, y);
  return 0.5 * dot(diff, diff);
}

/** dL/dyHat = yHat - y for L = 1/2 ||yHat - y||^2. */
export function mseLossGrad(yHat: Vector, y: Vector): Vector {
  return vecSub(yHat, y);
}

export function forward(spec: NetworkSpec, x: Vector, y: Vector): ForwardResult {
  assertSpecConsistency(spec, x);
  if (y.length !== spec.layers[spec.layers.length - 1].b.length) {
    throw new Error(`forward: target y has length ${y.length} but output layer has ${spec.layers[spec.layers.length - 1].b.length}`);
  }
  const z: Vector[] = [];
  const h: Vector[] = [];
  let prev = x;
  for (let l = 0; l < spec.layers.length; l++) {
    const layer = spec.layers[l];
    const Wh = matvec(layer.W, prev);
    const zl = new Array<number>(Wh.length);
    for (let i = 0; i < Wh.length; i++) zl[i] = Wh[i] + layer.b[i];
    const hl = applyActivation(zl, layer.activation);
    z.push(zl);
    h.push(hl);
    prev = hl;
  }
  const yHat = h[h.length - 1];
  const loss = mseLoss(yHat, y);
  return { z, h, yHat, loss };
}

/**
 * Backward pass. Walks from the loss back to the input.
 * For each layer l (output last):
 *   dL/dz_l = dL/dh_l (*) sigma'(z_l)
 *   dL/dW_l = (dL/dz_l) (h_{l-1})^T          // outer product, shape (n_l, n_{l-1})
 *   dL/db_l = dL/dz_l
 *   dL/dh_{l-1} = W_l^T (dL/dz_l)            // matrix-vector form, equivalent to multi-path summation
 */
export function backward(
  spec: NetworkSpec,
  fwd: ForwardResult,
  x: Vector,
  y: Vector,
): BackwardResult {
  const L = spec.layers.length;
  const dyHat = mseLossGrad(fwd.yHat, y);

  const dz: Vector[] = new Array<Vector>(L);
  const dh: Vector[] = new Array<Vector>(L);
  const dW = new Array<ReturnType<typeof zerosMatrix>>(L);
  const db: Vector[] = new Array<Vector>(L);

  // dh[L-1] = dyHat
  dh[L - 1] = dyHat.slice();

  for (let l = L - 1; l >= 0; l--) {
    const layer = spec.layers[l];
    const sigmaPrime = activationPrimeVector(fwd.z[l], layer.activation);
    dz[l] = hadamard(dh[l], sigmaPrime);

    const prevH = l === 0 ? x : fwd.h[l - 1];
    dW[l] = outer(dz[l], prevH);
    db[l] = dz[l].slice();

    if (l > 0) {
      dh[l - 1] = matvec(transpose(layer.W), dz[l]);
    }
  }

  const dxIn = matvec(transpose(spec.layers[0].W), dz[0]);

  // Defensive: ensure all slots are populated (for the L === 1 path where dh[0] is set above
  // but dh[-1] would be nonsense).
  for (let l = 0; l < L; l++) {
    if (!dh[l]) dh[l] = zerosVector(spec.layers[l].b.length);
  }

  return { dW, db, dz, dh, dyHat, dxIn };
}
