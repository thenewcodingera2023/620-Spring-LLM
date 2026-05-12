// Unit tests for the deterministic token-array -> 2D-vector encoding used by Layer 1.
// These tests do NOT exercise the tokenizer; they only check the math of encodeTokens.

import { describe, expect, it } from 'vitest';
import { encodeTokens, meanOf } from '../math/tokenEncoding';

const N = 100277; // cl100k_base vocabulary size, the production normalizer.

describe('meanOf', () => {
  it('returns 0 for an empty array', () => {
    expect(meanOf([])).toBe(0);
  });

  it('returns the single value for a singleton', () => {
    expect(meanOf([42])).toBe(42);
  });

  it('returns the arithmetic mean for multiple values', () => {
    expect(meanOf([10, 20, 30, 40])).toBeCloseTo(25, 12);
  });
});

describe('encodeTokens', () => {
  it('throws on a non-positive normalizer', () => {
    expect(() => encodeTokens([1, 2, 3], 0)).toThrow();
    expect(() => encodeTokens([1, 2, 3], -1)).toThrow();
    expect(() => encodeTokens([1, 2, 3], Number.NaN)).toThrow();
  });

  it('empty input maps to x = [-1, tanh(-1)]', () => {
    const { x, meanTokenId, tokenCount } = encodeTokens([], N);
    expect(meanTokenId).toBe(0);
    expect(tokenCount).toBe(0);
    expect(x[0]).toBeCloseTo(-1, 12);
    expect(x[1]).toBeCloseTo(Math.tanh(-1), 12);
    expect(Number.isFinite(x[0])).toBe(true);
    expect(Number.isFinite(x[1])).toBe(true);
  });

  it('x[1] is negative when count < 5', () => {
    for (const count of [1, 2, 3, 4]) {
      const ids = Array.from({ length: count }, (_, i) => i + 1);
      const { x } = encodeTokens(ids, N);
      expect(x[1]).toBeLessThan(0);
    }
  });

  it('x[1] is exactly tanh(0) = 0 when count is 5', () => {
    const ids = [1, 2, 3, 4, 5];
    const { x } = encodeTokens(ids, N);
    expect(x[1]).toBeCloseTo(0, 12);
  });

  it('x[1] is positive when count > 5', () => {
    for (const count of [6, 10, 50, 200]) {
      const ids = Array.from({ length: count }, (_, i) => i + 1);
      const { x } = encodeTokens(ids, N);
      expect(x[1]).toBeGreaterThan(0);
    }
  });

  it('x[1] saturates toward +1 for long inputs', () => {
    const longIds = Array.from({ length: 1000 }, (_, i) => i + 1);
    const { x } = encodeTokens(longIds, N);
    expect(x[1]).toBeGreaterThan(0.999);
    expect(x[1]).toBeLessThanOrEqual(1);
  });

  it('x[0] is clamped to [-1, 1] for any token-id distribution', () => {
    const corners = [
      [0, 0, 0],
      [N - 1, N - 1, N - 1],
      [N * 2, N * 2], // pathological values larger than N still clamp
      [10000, 20000, 30000],
    ];
    for (const ids of corners) {
      const { x } = encodeTokens(ids, N);
      expect(x[0]).toBeGreaterThanOrEqual(-1);
      expect(x[0]).toBeLessThanOrEqual(1);
      expect(Number.isFinite(x[0])).toBe(true);
    }
  });

  it('mean token ID and computed x[0] match the formula for a normal input', () => {
    // For ids = [10000, 20000, 30000] mean = 20000; x[0] = (20000/N)*2 - 1.
    const ids = [10000, 20000, 30000];
    const { x, meanTokenId, tokenCount } = encodeTokens(ids, N);
    expect(meanTokenId).toBe(20000);
    expect(tokenCount).toBe(3);
    expect(x[0]).toBeCloseTo((20000 / N) * 2 - 1, 12);
  });

  it('produces finite numbers for short, normal, and long inputs', () => {
    const cases: number[][] = [
      [],
      [42],
      [100, 200, 300],
      Array.from({ length: 50 }, (_, i) => (i * 1234) % N),
      Array.from({ length: 500 }, (_, i) => (i * 7919) % N),
    ];
    for (const ids of cases) {
      const { x } = encodeTokens(ids, N);
      expect(Number.isFinite(x[0])).toBe(true);
      expect(Number.isFinite(x[1])).toBe(true);
    }
  });
});
