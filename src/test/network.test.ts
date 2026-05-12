import { describe, expect, it } from 'vitest';
import { sampleInput, sampleSpec, sampleTarget } from '../data/sampleNetwork';
import { gradFD, gradFDMatrix } from '../math/finiteDifference';
import { dot, matvec, transpose } from '../math/linalg';
import {
  backward,
  forward,
  mseLoss,
  relu,
  reluPrime,
} from '../math/network';
import type { Matrix, NetworkSpec, Vector } from '../math/types';

const TOL_EXACT = 1e-12;
const TOL_FD = 1e-4;

function lossOf(spec: NetworkSpec, x: Vector, y: Vector): number {
  return forward(spec, x, y).loss;
}

function withReplacedW(
  spec: NetworkSpec,
  layerIdx: number,
  newW: Matrix,
): NetworkSpec {
  return {
    layers: spec.layers.map((layer, i) =>
      i === layerIdx ? { ...layer, W: newW } : layer,
    ),
  };
}

function withReplacedB(
  spec: NetworkSpec,
  layerIdx: number,
  newB: Vector,
): NetworkSpec {
  return {
    layers: spec.layers.map((layer, i) =>
      i === layerIdx ? { ...layer, b: newB } : layer,
    ),
  };
}

describe('relu and its subgradient', () => {
  it('relu agrees with max(0, z) on negative, zero, positive', () => {
    expect(relu(-1)).toBe(0);
    expect(relu(0)).toBe(0);
    expect(relu(1)).toBe(1);
    expect(relu(2.5)).toBe(2.5);
  });

  it('reluPrime uses the locked subgradient convention sigma_prime(0) = 0', () => {
    expect(reluPrime(-1)).toBe(0);
    expect(reluPrime(0)).toBe(0);
    expect(reluPrime(1)).toBe(1);
    expect(reluPrime(0.001)).toBe(1);
  });
});

describe('forward pass on the locked [2, 3, 2] sample', () => {
  it('produces the expected shapes', () => {
    const f = forward(sampleSpec, sampleInput, sampleTarget);
    expect(f.z).toHaveLength(2);
    expect(f.h).toHaveLength(2);
    expect(f.z[0]).toHaveLength(3);
    expect(f.h[0]).toHaveLength(3);
    expect(f.z[1]).toHaveLength(2);
    expect(f.h[1]).toHaveLength(2);
    expect(f.yHat).toHaveLength(2);
    expect(sampleSpec.layers[0].W).toHaveLength(3);
    expect(sampleSpec.layers[0].W[0]).toHaveLength(2);
    expect(sampleSpec.layers[1].W).toHaveLength(2);
    expect(sampleSpec.layers[1].W[0]).toHaveLength(3);
  });

  it('matches a hand-computed pass to within 1e-12', () => {
    const f = forward(sampleSpec, sampleInput, sampleTarget);

    // z_1 hand-computed with W1=[[1.0,-0.4],[0.2,0.6],[0.3,-0.2]], b1=[0,0,0], x=[0.5,-0.3]:
    //   z_1[0] = 1.0*0.5 + (-0.4)*(-0.3) + 0 = 0.62
    //   z_1[1] = 0.2*0.5 +   0.6*(-0.3) + 0 = -0.08
    //   z_1[2] = 0.3*0.5 + (-0.2)*(-0.3) + 0 = 0.21
    expect(f.z[0][0]).toBeCloseTo(0.62, 12);
    expect(f.z[0][1]).toBeCloseTo(-0.08, 12);
    expect(f.z[0][2]).toBeCloseTo(0.21, 12);

    // h_1 = ReLU(z_1) — index 1 is the dead unit for this sample
    expect(f.h[0][0]).toBeCloseTo(0.62, 12);
    expect(f.h[0][1]).toBeCloseTo(0, 12);
    expect(f.h[0][2]).toBeCloseTo(0.21, 12);

    // z_2 hand-computed with W2=[[0.5,-0.7,0.4],[0.1,0.3,-0.6]], b2=[0,0]:
    //   z_2[0] = 0.5*0.62 + (-0.7)*0 + 0.4*0.21 + 0 = 0.394
    //   z_2[1] = 0.1*0.62 +   0.3*0 + (-0.6)*0.21 + 0 = -0.064
    expect(f.z[1][0]).toBeCloseTo(0.394, 12);
    expect(f.z[1][1]).toBeCloseTo(-0.064, 12);

    // identity output: yHat == z_2
    expect(f.yHat[0]).toBeCloseTo(0.394, 12);
    expect(f.yHat[1]).toBeCloseTo(-0.064, 12);

    // loss = 1/2 * ((0.394-1)^2 + (-0.064-0)^2) = 0.185666
    expect(f.loss).toBeCloseTo(0.185666, 12);
  });

  it('rejects shape-inconsistent inputs', () => {
    expect(() => forward(sampleSpec, [0, 0, 0], sampleTarget)).toThrow();
    expect(() => forward(sampleSpec, sampleInput, [0])).toThrow();
  });
});

describe('mseLoss as a sanity reference', () => {
  it('matches direct 1/2 ||yHat - y||^2', () => {
    const yHat = [0.394, -0.064];
    const y = [1, 0];
    const expected = 0.5 * ((0.394 - 1) ** 2 + (-0.064) ** 2);
    expect(mseLoss(yHat, y)).toBeCloseTo(expected, 12);
  });
});

describe('backward pass on the locked sample', () => {
  it('returns gradients of the right shape', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);

    expect(back.dyHat).toHaveLength(fwd.yHat.length);
    expect(back.dxIn).toHaveLength(sampleInput.length);
    expect(back.dW).toHaveLength(sampleSpec.layers.length);
    expect(back.db).toHaveLength(sampleSpec.layers.length);

    for (let l = 0; l < sampleSpec.layers.length; l++) {
      expect(back.dW[l]).toHaveLength(sampleSpec.layers[l].W.length);
      expect(back.dW[l][0]).toHaveLength(sampleSpec.layers[l].W[0].length);
      expect(back.db[l]).toHaveLength(sampleSpec.layers[l].b.length);
      expect(back.dz[l]).toHaveLength(fwd.z[l].length);
      expect(back.dh[l]).toHaveLength(fwd.h[l].length);
    }
  });

  it('dyHat equals yHat - y', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    expect(back.dyHat[0]).toBeCloseTo(fwd.yHat[0] - sampleTarget[0], 12);
    expect(back.dyHat[1]).toBeCloseTo(fwd.yHat[1] - sampleTarget[1], 12);
  });

  it('weight gradients pass a finite-difference check (per layer, per entry)', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);

    for (let l = 0; l < sampleSpec.layers.length; l++) {
      const fdW = gradFDMatrix(
        (M) => lossOf(withReplacedW(sampleSpec, l, M), sampleInput, sampleTarget),
        // pass a fresh copy because gradFDMatrix temporarily mutates entries
        sampleSpec.layers[l].W.map((r) => r.slice()),
      );
      for (let i = 0; i < back.dW[l].length; i++) {
        for (let j = 0; j < back.dW[l][i].length; j++) {
          expect(Math.abs(back.dW[l][i][j] - fdW[i][j])).toBeLessThan(TOL_FD);
        }
      }
    }
  });

  it('bias gradients pass a finite-difference check', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);

    for (let l = 0; l < sampleSpec.layers.length; l++) {
      const fdB = gradFD(
        (b) => lossOf(withReplacedB(sampleSpec, l, b), sampleInput, sampleTarget),
        sampleSpec.layers[l].b.slice(),
      );
      for (let i = 0; i < back.db[l].length; i++) {
        expect(Math.abs(back.db[l][i] - fdB[i])).toBeLessThan(TOL_FD);
      }
    }
  });

  it('input gradient passes a finite-difference check', () => {
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    const fdX = gradFD(
      (xi) => lossOf(sampleSpec, xi, sampleTarget),
      sampleInput.slice(),
    );
    for (let i = 0; i < back.dxIn.length; i++) {
      expect(Math.abs(back.dxIn[i] - fdX[i])).toBeLessThan(TOL_FD);
    }
  });

  it('multi-path summation form equals the matrix-vector form', () => {
    // For every layer l, (W_{l}^T dL/dz_l)[j] == sum_k (dL/dz_l)[k] * W_l[k, j].
    // This is the explicit chain-rule expansion (L1-13) versus the vectorized form (L1-12).
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);

    for (let l = 0; l < sampleSpec.layers.length; l++) {
      const W = sampleSpec.layers[l].W;
      const matrixForm = matvec(transpose(W), back.dz[l]);
      const dzL = back.dz[l];
      for (let j = 0; j < W[0].length; j++) {
        let summation = 0;
        for (let k = 0; k < W.length; k++) summation += dzL[k] * W[k][j];
        expect(Math.abs(matrixForm[j] - summation)).toBeLessThan(TOL_EXACT);
      }
    }
  });

  it('prev-layer gradient agrees with the dot-product expansion (sanity)', () => {
    // Same identity, written as dot product for additional clarity.
    const fwd = forward(sampleSpec, sampleInput, sampleTarget);
    const back = backward(sampleSpec, fwd, sampleInput, sampleTarget);
    const W = sampleSpec.layers[1].W;
    const colJ = (j: number): Vector => W.map((row) => row[j]);
    for (let j = 0; j < W[0].length; j++) {
      const expected = dot(back.dz[1], colJ(j));
      expect(Math.abs(back.dh[0][j] - expected)).toBeLessThan(TOL_EXACT);
    }
  });
});
