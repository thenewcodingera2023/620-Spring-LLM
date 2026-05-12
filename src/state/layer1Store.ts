// Layer 1 state hook. Drives the "Inside the Network" pipeline:
//   text -> tokens -> [x0, x1] -> forward([2,3,2]) -> loss -> backward -> one GD step.
//
// All math is performed by pure tested modules (tokenizer, tokenEncoding, network, gradientDescent).
// This file only orchestrates: it owns the text input, derives x, recomputes forward/backward and
// the one-step weight update, and exposes visibility flags keyed to an 11-step animation timeline.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LEARNING_RATE,
  OUTPUT_LABELS,
  sampleInputText,
  sampleSpec,
  sampleTarget,
} from '../data/sampleNetwork';
import {
  ENCODING_NAME,
  TOKEN_ID_NORMALIZER,
  tokenize,
  type TokenizerMode,
} from '../data/tokenizer';
import { applyGradientStep } from '../math/gradientDescent';
import { backward, forward, reluPrime } from '../math/network';
import { encodeTokens } from '../math/tokenEncoding';
import type { BackwardResult, ForwardResult, NetworkSpec, Vector } from '../math/types';

export const LAYER1_MAX_STEP = 10;
export const LAYER1_PLAY_INTERVAL_MS = 1500;

export type SelectedElement =
  | { kind: 'input'; index: number }
  | { kind: 'hidden'; index: number }
  | { kind: 'output'; index: number }
  | { kind: 'loss' }
  | { kind: 'edge-fwd'; layer: number; row: number; col: number };

export interface Visibility {
  /** Token panel reveal (step 1+). */
  tokens: boolean;
  /** Encoded x vector reveal (step 2+). */
  encoded: boolean;
  /** z_1 values rendered on hidden nodes (step 3+). */
  z1: boolean;
  /** h_1 values rendered on hidden nodes (step 4+). */
  h1: boolean;
  /** yHat values rendered on output nodes (step 5+). */
  yHat: boolean;
  /** Loss value rendered on the loss node (step 6+). */
  loss: boolean;
  /** dL/dyHat arrow visible and dL/dW_2 derivable (step 7+). */
  backwardOutput: boolean;
  /** dL/dW_2, dL/db_2, dL/dh_1 visible (step 7+). */
  outputGrads: boolean;
  /** dL/dz_1 (ReLU' gate) visible (step 8+). */
  hiddenGate: boolean;
  /** dL/dW_1, dL/db_1, dL/dx visible (step 9+). */
  hiddenGrads: boolean;
  /** Multi-path summation summary visible (step 9+). */
  chainRule: boolean;
  /** Gradient-descent update panel visible (step 10). */
  update: boolean;
}

export function deriveVisibility(step: number): Visibility {
  return {
    tokens: step >= 1,
    encoded: step >= 2,
    z1: step >= 3,
    h1: step >= 4,
    yHat: step >= 5,
    loss: step >= 6,
    backwardOutput: step >= 7,
    outputGrads: step >= 7,
    hiddenGate: step >= 8,
    hiddenGrads: step >= 9,
    chainRule: step >= 9,
    update: step >= 10,
  };
}

export const STEP_LABELS: readonly {
  id: number;
  name: string;
  phase: 'input' | 'forward' | 'loss' | 'backward' | 'summary';
}[] = [
  { id: 0, name: 'Text input', phase: 'input' },
  { id: 1, name: 'Tokenization', phase: 'input' },
  { id: 2, name: 'Encoding to x', phase: 'input' },
  { id: 3, name: 'Hidden pre-activation z_1', phase: 'forward' },
  { id: 4, name: 'ReLU activation h_1', phase: 'forward' },
  { id: 5, name: 'Output yHat', phase: 'forward' },
  { id: 6, name: 'Loss', phase: 'loss' },
  { id: 7, name: 'dL/dyHat and dL/dW_2', phase: 'backward' },
  { id: 8, name: 'Backprop through hidden layer', phase: 'backward' },
  { id: 9, name: 'dL/dW_1', phase: 'backward' },
  { id: 10, name: 'Gradient descent update', phase: 'summary' },
];

function elementsEqual(a: SelectedElement, b: SelectedElement): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'input':
      return b.kind === 'input' && a.index === b.index;
    case 'hidden':
      return b.kind === 'hidden' && a.index === b.index;
    case 'output':
      return b.kind === 'output' && a.index === b.index;
    case 'loss':
      return b.kind === 'loss';
    case 'edge-fwd':
      return (
        b.kind === 'edge-fwd' &&
        a.layer === b.layer &&
        a.row === b.row &&
        a.col === b.col
      );
  }
}

export interface Layer1State {
  /** Network architecture and locked weights/biases. */
  spec: NetworkSpec;
  /** Live input vector derived from the user's typed text. */
  x: Vector;
  /** Target vector y = [1, 0] (hardcoded teaching target). */
  y: Vector;
  /** Output teaching labels: ["factual question", "command"]. */
  outputLabels: readonly string[];
  /** Live text input contents. */
  inputText: string;
  /** Tokenized ids for inputText. */
  tokens: number[];
  /** Tokenizer mode currently in effect: 'real' = js-tiktoken, 'fallback' = local hash. */
  tokenizerMode: TokenizerMode;
  /** Encoding name (e.g., 'cl100k_base'). */
  encodingName: string;
  /** Vocabulary normalizer used to scale meanTokenId into [-1, 1]. */
  tokenIdNormalizer: number;
  /** Mean of the current token-id array (0 when empty). */
  meanTokenId: number;
  /** Forward pass result for (spec, x, y). */
  fwd: ForwardResult;
  /** Backward pass result for (spec, fwd, x, y). */
  back: BackwardResult;
  /** Per-layer ReLU/identity derivative vectors. */
  sigmaPrime: number[][];
  /** Learning rate used by the single GD step shown in step 10. */
  eta: number;
  /** Hypothetical spec after one GD step on this single (x, y) example. */
  updatedSpec: NetworkSpec;
  step: number;
  isPlaying: boolean;
  selected: SelectedElement | null;
  visibility: Visibility;
  maxStep: number;
  setInputText(text: string): void;
  setStep(step: number): void;
  advance(): void;
  rewind(): void;
  reset(): void;
  togglePlay(): void;
  select(element: SelectedElement | null): void;
}

interface DerivedFromText {
  x: Vector;
  tokens: number[];
  tokenizerMode: TokenizerMode;
  encodingName: string;
  meanTokenId: number;
}

function deriveFromText(text: string): DerivedFromText {
  const { ids, encoding, mode } = tokenize(text);
  const { x, meanTokenId } = encodeTokens(ids, TOKEN_ID_NORMALIZER);
  return {
    x,
    tokens: ids,
    tokenizerMode: mode,
    encodingName: encoding,
    meanTokenId,
  };
}

export function useLayer1State(): Layer1State {
  const spec = sampleSpec;
  const y = sampleTarget;
  const eta = DEFAULT_LEARNING_RATE;

  const [inputText, setInputTextState] = useState<string>(sampleInputText);
  const [step, setStepState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selected, setSelected] = useState<SelectedElement | null>(null);

  const derived = useMemo(() => deriveFromText(inputText), [inputText]);
  const x = derived.x;

  const fwd = useMemo(() => forward(spec, x, y), [spec, x, y]);
  const back = useMemo(() => backward(spec, fwd, x, y), [spec, fwd, x, y]);
  const sigmaPrime = useMemo<number[][]>(
    () =>
      fwd.z.map((zl, l) =>
        spec.layers[l].activation === 'relu' ? zl.map(reluPrime) : zl.map(() => 1),
      ),
    [spec, fwd],
  );
  const updatedSpec = useMemo(() => applyGradientStep(spec, back, eta), [spec, back, eta]);

  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const current = stepRef.current;
      if (current >= LAYER1_MAX_STEP) {
        setIsPlaying(false);
        return;
      }
      setStepState(current + 1);
    }, LAYER1_PLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const setStep = useCallback((next: number) => {
    setStepState(Math.min(Math.max(next, 0), LAYER1_MAX_STEP));
  }, []);

  const advance = useCallback(() => {
    setStepState((s) => Math.min(s + 1, LAYER1_MAX_STEP));
  }, []);

  const rewind = useCallback(() => {
    setStepState((s) => Math.max(s - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setStepState(0);
    setIsPlaying(false);
    setSelected(null);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => {
      if (!p && stepRef.current >= LAYER1_MAX_STEP) {
        setStepState(0);
      }
      return !p;
    });
  }, []);

  const select = useCallback((element: SelectedElement | null) => {
    setSelected((current) => {
      if (!element) return null;
      if (current && elementsEqual(current, element)) return null;
      return element;
    });
  }, []);

  const setInputText = useCallback((text: string) => {
    setInputTextState(text);
  }, []);

  const visibility = useMemo(() => deriveVisibility(step), [step]);

  return {
    spec,
    x,
    y,
    outputLabels: OUTPUT_LABELS,
    inputText,
    tokens: derived.tokens,
    tokenizerMode: derived.tokenizerMode,
    encodingName: derived.encodingName,
    tokenIdNormalizer: TOKEN_ID_NORMALIZER,
    meanTokenId: derived.meanTokenId,
    fwd,
    back,
    sigmaPrime,
    eta,
    updatedSpec,
    step,
    isPlaying,
    selected,
    visibility,
    maxStep: LAYER1_MAX_STEP,
    setInputText,
    setStep,
    advance,
    rewind,
    reset,
    togglePlay,
    select,
  };
}

// Re-export the encoding name and normalizer for components that need to surface them.
export { ENCODING_NAME, TOKEN_ID_NORMALIZER };
