// Mathematical types for the calculus visualization.
// Convention: vectors are column vectors, represented as number[].
// A matrix A of shape (m, n) maps R^n -> R^m by left multiplication: (A x)[i] = sum_j A[i][j] * x[j].
// A is stored row-major as number[][], so A[i][j] is the entry at row i, column j.

export type Vector = number[];
export type Matrix = number[][];

export type Activation = 'relu' | 'identity';

export interface LayerSpec {
  /** Weight matrix of shape (n_l, n_{l-1}). */
  W: Matrix;
  /** Bias vector of shape (n_l,). */
  b: Vector;
  /** Per-layer activation. The plan locks the output layer to 'identity' and the hidden layer to 'relu'. */
  activation: Activation;
}

export interface NetworkSpec {
  /** Layers in forward order. layers[0] is the first hidden layer; layers[layers.length - 1] is the output layer. */
  layers: LayerSpec[];
}

export interface ForwardResult {
  /** Pre-activations per layer. z[l] has shape (n_{l+1},). z.length === spec.layers.length. */
  z: Vector[];
  /** Activations per layer. h[l] has shape (n_{l+1},). h.length === spec.layers.length. */
  h: Vector[];
  /** Output prediction yHat == h[L-1] (since output activation is identity). */
  yHat: Vector;
  /** Mean squared loss L = 1/2 ||yHat - y||^2. */
  loss: number;
}

export interface BackwardResult {
  /** dL/dW[l] has the same shape as spec.layers[l].W. */
  dW: Matrix[];
  /** dL/db[l] has the same shape as spec.layers[l].b. */
  db: Vector[];
  /** dL/dz[l] has the same shape as the forward z[l]. */
  dz: Vector[];
  /** dL/dh[l] has the same shape as the forward h[l]. By convention dh[L-1] == dyHat. */
  dh: Vector[];
  /** dL/dyHat = yHat - y. */
  dyHat: Vector;
  /** dL/dx, gradient with respect to the network input. */
  dxIn: Vector;
}
