// Single-step gradient descent update for a NetworkSpec.
//
// Given the backward result for one (x, y) example, produce a *new* NetworkSpec with
//   W_new = W_old - eta * dL/dW
//   b_new = b_old - eta * dL/db
// for every layer. This does not mutate the input spec — the caller can compare before/after.
//
// One example does not "train" the network; the demo uses this to make the gradient-descent
// rule concrete by showing one step. Production training runs this rule across many examples
// for many iterations.

import type { BackwardResult, NetworkSpec } from './types';

export function applyGradientStep(
  spec: NetworkSpec,
  back: BackwardResult,
  eta: number,
): NetworkSpec {
  if (!Number.isFinite(eta)) {
    throw new Error(`applyGradientStep requires a finite eta, got ${eta}`);
  }
  if (back.dW.length !== spec.layers.length || back.db.length !== spec.layers.length) {
    throw new Error(
      `applyGradientStep: backward gradients have ${back.dW.length} layers but spec has ${spec.layers.length}`,
    );
  }

  const layers = spec.layers.map((layer, l) => {
    const dWl = back.dW[l];
    const dbl = back.db[l];
    const rows = layer.W.length;
    const cols = rows > 0 ? layer.W[0].length : 0;
    if (dWl.length !== rows || (rows > 0 && dWl[0].length !== cols)) {
      throw new Error(
        `applyGradientStep: layer ${l} W is ${rows}x${cols} but dW is ${dWl.length}x${dWl[0]?.length ?? 0}`,
      );
    }
    if (dbl.length !== layer.b.length) {
      throw new Error(
        `applyGradientStep: layer ${l} b length ${layer.b.length} != db length ${dbl.length}`,
      );
    }
    const newW = layer.W.map((row, i) => row.map((value, j) => value - eta * dWl[i][j]));
    const newB = layer.b.map((value, i) => value - eta * dbl[i]);
    return {
      W: newW,
      b: newB,
      activation: layer.activation,
    };
  });

  return { layers };
}
