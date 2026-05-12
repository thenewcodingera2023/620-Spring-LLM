// Deterministic projection from a token-id array to the network's 2-dimensional input vector.
//
// This is a fixed hand-designed encoding for the visualization. A real system would learn an
// embedding matrix by gradient descent. We compress to exactly two numbers because the demo
// network has a 2-dimensional input slot.
//
// x[0] = (meanTokenId / TOKEN_ID_NORMALIZER) * 2 - 1
//        roughly normalizes the average token id to the range [-1, 1]. For cl100k_base the
//        normalizer is 100277, so most natural-language inputs land near the middle of that
//        range. The result is clamped to [-1, 1] so unusual special-token ids cannot push x
//        out of bounds.
//
// x[1] = tanh((tokenCount - 5) / 5)
//        compresses token-count into (-1, 1). Negative when count < 5, near 0 around 5,
//        positive when count > 5. Saturates smoothly so very long inputs do not explode.
//
// Empty inputs map to x = [-1, tanh(-1)]: meanTokenId = 0 (so the first term is -1) and
// tokenCount = 0 (so the second term is tanh(-1) ≈ -0.762). This is documented in the UI so the
// behavior is not a hidden surprise.

import type { Vector } from './types';

export interface TokenEncodingResult {
  x: Vector;
  meanTokenId: number;
  tokenCount: number;
}

function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

export function meanOf(ids: readonly number[]): number {
  if (ids.length === 0) return 0;
  let sum = 0;
  for (const id of ids) sum += id;
  return sum / ids.length;
}

export function encodeTokens(ids: readonly number[], normalizer: number): TokenEncodingResult {
  if (!Number.isFinite(normalizer) || normalizer <= 0) {
    throw new Error(`encodeTokens requires a positive finite normalizer, got ${normalizer}`);
  }
  const tokenCount = ids.length;
  const meanTokenId = meanOf(ids);
  const x0Raw = (meanTokenId / normalizer) * 2 - 1;
  const x0 = clamp(x0Raw, -1, 1);
  const x1 = Math.tanh((tokenCount - 5) / 5);
  return {
    x: [x0, x1],
    meanTokenId,
    tokenCount,
  };
}
