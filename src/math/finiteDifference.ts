// Numerical-gradient utilities used only in tests. Pure math.

import type { Matrix, Vector } from './types';

/**
 * Central-difference gradient of a scalar function f: R^n -> R at x.
 * Returns the numerical gradient; does not mutate x.
 */
export function gradFD(f: (x: Vector) => number, x: Vector, eps = 1e-6): Vector {
  const n = x.length;
  const grad = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const xPlus = x.slice();
    const xMinus = x.slice();
    xPlus[i] += eps;
    xMinus[i] -= eps;
    grad[i] = (f(xPlus) - f(xMinus)) / (2 * eps);
  }
  return grad;
}

/**
 * Central-difference gradient over the entries of a matrix M with respect to a scalar function
 * f: Matrix -> R. Returns a matrix of the same shape.
 */
export function gradFDMatrix(f: (M: Matrix) => number, M: Matrix, eps = 1e-6): Matrix {
  const rows = M.length;
  const cols = rows === 0 ? 0 : M[0].length;
  const grad: Matrix = new Array<Vector>(rows);
  for (let i = 0; i < rows; i++) {
    const row = new Array<number>(cols).fill(0);
    for (let j = 0; j < cols; j++) {
      const original = M[i][j];
      M[i][j] = original + eps;
      const fPlus = f(M);
      M[i][j] = original - eps;
      const fMinus = f(M);
      M[i][j] = original;
      row[j] = (fPlus - fMinus) / (2 * eps);
    }
    grad[i] = row;
  }
  return grad;
}
