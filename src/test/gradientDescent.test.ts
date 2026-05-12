// Unit tests for the single-step gradient-descent rule used by Layer 1 step 10.
// Targeted: deterministic update on the locked sample, dead-ReLU zero-gradient rows, shape and
// validation behaviour, and non-mutation of the input spec.

import { describe, expect, it } from 'vitest';
import { sampleInput, sampleSpec, sampleTarget } from '../data/sampleNetwork';
import { applyGradientStep } from '../math/gradientDescent';
import { backward, forward } from '../math/network';

const ETA = 0.1;

describe('applyGradientStep', () => {
  it('produces a new spec without mutating the input', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    const originalW1 = sampleSpec.layers[0].W.map((row) => row.slice());
    const originalW2 = sampleSpec.layers[1].W.map((row) => row.slice());

    const updated = applyGradientStep(sampleSpec, back, ETA);

    expect(updated).not.toBe(sampleSpec);
    expect(updated.layers[0]).not.toBe(sampleSpec.layers[0]);
    expect(sampleSpec.layers[0].W).toEqual(originalW1);
    expect(sampleSpec.layers[1].W).toEqual(originalW2);
  });

  it('rows tied to dead ReLU units have zero W_1 gradient (no update)', () => {
    // For sampleInput = [0.5, -0.3] with the current weights, hidden unit 1 is dead
    // (z_1[1] = -0.08 <= 0). Its dL/dW_1 row must therefore be all zero, and the updated
    // row must equal the original row.
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    const updated = applyGradientStep(sampleSpec, back, ETA);

    expect(fwd.z[0][1]).toBeLessThanOrEqual(0); // sanity: unit 1 is dead for this sample
    // Use abs(...) === 0 so that JavaScript's -0 (a normal artifact of multiplying by 0) counts
    // as zero rather than tripping toEqual's distinct-zero check.
    expect(Math.abs(back.dW[0][1][0])).toBe(0);
    expect(Math.abs(back.dW[0][1][1])).toBe(0);
    expect(updated.layers[0].W[1]).toEqual(sampleSpec.layers[0].W[1]);
  });

  it('applies the rule W_new = W_old - eta * dL/dW entrywise', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    const updated = applyGradientStep(sampleSpec, back, ETA);

    for (let l = 0; l < sampleSpec.layers.length; l++) {
      const oldW = sampleSpec.layers[l].W;
      const newW = updated.layers[l].W;
      const dW = back.dW[l];
      for (let i = 0; i < oldW.length; i++) {
        for (let j = 0; j < oldW[i].length; j++) {
          expect(newW[i][j]).toBeCloseTo(oldW[i][j] - ETA * dW[i][j], 12);
        }
      }
      const oldB = sampleSpec.layers[l].b;
      const newB = updated.layers[l].b;
      const dB = back.db[l];
      for (let i = 0; i < oldB.length; i++) {
        expect(newB[i]).toBeCloseTo(oldB[i] - ETA * dB[i], 12);
      }
    }
  });

  it('the post-update loss is lower than the pre-update loss for a positive eta', () => {
    // A gradient step in the direction of -grad(L) is guaranteed to lower a smooth loss for a
    // small enough learning rate; eta = 0.1 is comfortably small on this convex sub-problem.
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    const updated = applyGradientStep(sampleSpec, back, ETA);
    const fwdAfter = forward(updated, sampleInput, sampleTarget);
    expect(fwdAfter.loss).toBeLessThan(fwd.loss);
  });

  it('rejects a non-finite eta', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    expect(() => applyGradientStep(sampleSpec, back, Number.NaN)).toThrow();
    expect(() => applyGradientStep(sampleSpec, back, Number.POSITIVE_INFINITY)).toThrow();
  });
});
