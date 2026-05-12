// Locked Layer 1 example for "Calculus Inside the Machine".
// Architecture: 2 -> 3 (ReLU) -> 2 (identity).
//
// The fixed-weight network. The input vector x is now derived live from the user's typed text via
// the tokenizer + tokenEncoding pipeline, so this file no longer pins x. We still expose a default
// text and a default x for tests and initial render, computed from that default text by the
// store at construction.
//
// Output interpretation (teaching labels only, not a claim that the network truly classifies):
//   output[0] -> "factual question"
//   output[1] -> "command"
// The target y = [1, 0] is hardcoded for demonstrating loss and backpropagation. The visualizer
// is not a classifier and the network has no embedding training to make these labels meaningful.

import type { NetworkSpec, Vector } from '../math/types';

export const sampleSpec: NetworkSpec = {
  layers: [
    {
      // (3 x 2): R^2 -> R^3
      W: [
        [1.0, -0.4],
        [0.2, 0.6],
        [0.3, -0.2],
      ],
      b: [0, 0, 0],
      activation: 'relu',
    },
    {
      // (2 x 3): R^3 -> R^2
      W: [
        [0.5, -0.7, 0.4],
        [0.1, 0.3, -0.6],
      ],
      b: [0, 0],
      activation: 'identity',
    },
  ],
};

export const sampleTarget: Vector = [1, 0];

// Default text rendered into the live input on first paint. The store tokenizes this and feeds
// the result through encodeTokens to produce the live x vector. For this default, real
// cl100k_base tokenization yields ~4 tokens with mean id ~10386, so x ≈ [-0.79, -0.20] and all
// three hidden units start dead — a useful prompt for the user to type something else and watch
// the network come to life.
export const sampleInputText = 'Who is Michael Jordan';

// Math-test fixture only. The UI never uses this; layer1Store derives x from sampleInputText
// via the tokenizer. We keep a stable, hand-pickable x here so the forward/backward unit tests
// have deterministic numbers that do not change with tokenizer-package upgrades.
export const sampleInput: Vector = [0.5, -0.3];

// Teaching labels for the two output components. These are *not* model-asserted classifications;
// they are arbitrary names a teacher would pin on each output slot when introducing the idea of
// a classification head.
export const OUTPUT_LABELS: readonly string[] = ['factual question', 'command'];

// Default learning rate used in the one-step gradient-descent demonstration on this page.
export const DEFAULT_LEARNING_RATE = 0.1;
