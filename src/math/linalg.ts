// Pure linear algebra primitives. No mutation of inputs; every function returns a new value.
// Shape mismatches throw a descriptive error. See types.ts for shape conventions.

import type { Matrix, Vector } from './types';

function assertSameLength(a: Vector, b: Vector, op: string): void {
  if (a.length !== b.length) {
    throw new Error(`${op}: vector length mismatch (${a.length} vs ${b.length})`);
  }
}

function matrixShape(A: Matrix): { rows: number; cols: number } {
  const rows = A.length;
  if (rows === 0) {
    return { rows: 0, cols: 0 };
  }
  const cols = A[0].length;
  for (let i = 1; i < rows; i++) {
    if (A[i].length !== cols) {
      throw new Error(`matrix is not rectangular: row 0 has ${cols} cols, row ${i} has ${A[i].length}`);
    }
  }
  return { rows, cols };
}

export function vecAdd(a: Vector, b: Vector): Vector {
  assertSameLength(a, b, 'vecAdd');
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
  return out;
}

export function vecSub(a: Vector, b: Vector): Vector {
  assertSameLength(a, b, 'vecSub');
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] - b[i];
  return out;
}

export function vecScale(a: Vector, s: number): Vector {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * s;
  return out;
}

export function dot(a: Vector, b: Vector): number {
  assertSameLength(a, b, 'dot');
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function norm(a: Vector): number {
  return Math.sqrt(dot(a, a));
}

export function hadamard(a: Vector, b: Vector): Vector {
  assertSameLength(a, b, 'hadamard');
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  return out;
}

/** matvec(A, x): for A of shape (m, n) and x of length n, returns A x of length m. */
export function matvec(A: Matrix, x: Vector): Vector {
  const { rows, cols } = matrixShape(A);
  if (cols !== x.length) {
    throw new Error(`matvec: shape mismatch, matrix is (${rows}, ${cols}) and vector has length ${x.length}`);
  }
  const out = new Array<number>(rows).fill(0);
  for (let i = 0; i < rows; i++) {
    let s = 0;
    const row = A[i];
    for (let j = 0; j < cols; j++) s += row[j] * x[j];
    out[i] = s;
  }
  return out;
}

/** transpose(A): for A of shape (m, n), returns A^T of shape (n, m). */
export function transpose(A: Matrix): Matrix {
  const { rows, cols } = matrixShape(A);
  const out: Matrix = new Array<Vector>(cols);
  for (let j = 0; j < cols; j++) {
    const row = new Array<number>(rows);
    for (let i = 0; i < rows; i++) row[i] = A[i][j];
    out[j] = row;
  }
  return out;
}

/** outer(a, b): for a of length m, b of length n, returns the (m, n) matrix M with M[i][j] = a[i] * b[j]. */
export function outer(a: Vector, b: Vector): Matrix {
  const m = a.length;
  const n = b.length;
  const out: Matrix = new Array<Vector>(m);
  for (let i = 0; i < m; i++) {
    const row = new Array<number>(n);
    for (let j = 0; j < n; j++) row[j] = a[i] * b[j];
    out[i] = row;
  }
  return out;
}

/** matmul(A, B): for A of shape (m, k) and B of shape (k, n), returns A B of shape (m, n). */
export function matmul(A: Matrix, B: Matrix): Matrix {
  const a = matrixShape(A);
  const b = matrixShape(B);
  if (a.cols !== b.rows) {
    throw new Error(`matmul: shape mismatch, A is (${a.rows}, ${a.cols}) and B is (${b.rows}, ${b.cols})`);
  }
  const out: Matrix = new Array<Vector>(a.rows);
  for (let i = 0; i < a.rows; i++) {
    const row = new Array<number>(b.cols).fill(0);
    for (let k = 0; k < a.cols; k++) {
      const aik = A[i][k];
      const bk = B[k];
      for (let j = 0; j < b.cols; j++) row[j] += aik * bk[j];
    }
    out[i] = row;
  }
  return out;
}

export function zerosVector(n: number): Vector {
  return new Array<number>(n).fill(0);
}

export function zerosMatrix(rows: number, cols: number): Matrix {
  const out: Matrix = new Array<Vector>(rows);
  for (let i = 0; i < rows; i++) out[i] = new Array<number>(cols).fill(0);
  return out;
}

export function cloneVector(a: Vector): Vector {
  return a.slice();
}

export function cloneMatrix(A: Matrix): Matrix {
  return A.map((row) => row.slice());
}
