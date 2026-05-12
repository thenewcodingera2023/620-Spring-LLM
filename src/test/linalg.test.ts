import { describe, expect, it } from 'vitest';
import {
  cloneMatrix,
  cloneVector,
  dot,
  hadamard,
  matmul,
  matvec,
  norm,
  outer,
  transpose,
  vecAdd,
  vecScale,
  vecSub,
  zerosMatrix,
  zerosVector,
} from '../math/linalg';

describe('vector arithmetic', () => {
  it('vecAdd, vecSub, vecScale work componentwise', () => {
    expect(vecAdd([1, 2, 3], [4, -1, 0])).toEqual([5, 1, 3]);
    expect(vecSub([1, 2, 3], [4, -1, 0])).toEqual([-3, 3, 3]);
    expect(vecScale([1, -2, 3], 0.5)).toEqual([0.5, -1, 1.5]);
  });

  it('vecAdd / vecSub / hadamard throw on length mismatch', () => {
    expect(() => vecAdd([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
    expect(() => vecSub([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
    expect(() => hadamard([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
  });
});

describe('dot, norm, hadamard', () => {
  it('dot computes inner product', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBeCloseTo(32, 12);
    expect(dot([1, 0], [0, 1])).toBe(0);
  });

  it('norm is sqrt of dot with self', () => {
    expect(norm([3, 4])).toBeCloseTo(5, 12);
    expect(norm([0, 0, 0])).toBe(0);
  });

  it('hadamard multiplies elementwise', () => {
    expect(hadamard([1, 2, 3], [4, -1, 0])).toEqual([4, -2, 0]);
  });

  it('dot throws on length mismatch', () => {
    expect(() => dot([1, 2], [1])).toThrow(/length mismatch/);
  });
});

describe('matvec, transpose, outer, matmul', () => {
  it('matvec applies a matrix to a column vector', () => {
    // A is (2, 3), x in R^3, A x in R^2.
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(matvec(A, [1, 0, 0])).toEqual([1, 4]);
    expect(matvec(A, [0, 1, 0])).toEqual([2, 5]);
    expect(matvec(A, [0, 0, 1])).toEqual([3, 6]);
    expect(matvec(A, [1, 1, 1])).toEqual([6, 15]);
  });

  it('matvec throws on shape mismatch', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    expect(() => matvec(A, [1, 2, 3])).toThrow(/shape mismatch/);
  });

  it('transpose flips rows and columns', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(transpose(A)).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
    expect(transpose(transpose(A))).toEqual(A);
  });

  it('outer product produces an (m, n) matrix', () => {
    expect(outer([1, 2, 3], [10, 20])).toEqual([
      [10, 20],
      [20, 40],
      [30, 60],
    ]);
    expect(outer([1, 0], [1, 1])).toEqual([
      [1, 1],
      [0, 0],
    ]);
  });

  it('matmul agrees with composition of matvecs on each column', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    const B = [
      [5, 6, 7],
      [8, 9, 10],
    ];
    const AB = matmul(A, B);
    expect(AB).toEqual([
      [21, 24, 27],
      [47, 54, 61],
    ]);
    // Column 0 of AB equals matvec(A, column 0 of B).
    const b0 = [B[0][0], B[1][0]];
    expect(matvec(A, b0)).toEqual([AB[0][0], AB[1][0]]);
  });

  it('matmul throws on inner-dimension mismatch', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    const B = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    expect(() => matmul(A, B)).toThrow(/shape mismatch/);
  });
});

describe('helpers', () => {
  it('zeros constructors return all-zero shapes', () => {
    expect(zerosVector(3)).toEqual([0, 0, 0]);
    expect(zerosMatrix(2, 3)).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it('clone helpers return independent copies', () => {
    const v = [1, 2, 3];
    const v2 = cloneVector(v);
    v2[0] = 99;
    expect(v[0]).toBe(1);

    const M = [
      [1, 2],
      [3, 4],
    ];
    const M2 = cloneMatrix(M);
    M2[0][0] = 99;
    expect(M[0][0]).toBe(1);
  });
});
