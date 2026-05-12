// Preset query prompts for Layer 2 — Stage 6A.
//
// Each preset maps a short, human-friendly label to a FIXED query vector in 2D and 3D. There is
// no embedding model, no API call, and no learned representation: choosing a preset is
// equivalent to typing the corresponding fixed vector into the query controls. The label is
// teaching scaffolding, not semantics.
//
// All preset vectors are inside the magnitude clamp [0.1, 3.0] before clamping; the store still
// clamps on apply so that any future edits cannot break the clamp invariant.

import type { Vector } from '../math/types';

export interface QueryPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly vector2D: Vector;
  readonly vector3D: Vector;
  readonly explanation?: string;
}

export const queryPresets: readonly QueryPreset[] = [
  {
    id: 'world-cup-recap',
    label: 'world cup recap',
    description: 'A reader looking for a sports match summary.',
    vector2D: [1.4, 0.2],
    vector3D: [1.2, 0.5, 0.1],
    explanation: 'Points near Sports News — expect it to top the ranking.',
  },
  {
    id: 'llm-breakthroughs',
    label: 'llm breakthroughs',
    description: 'Aligned with the AI cluster (AI Research, AI Tutorial).',
    vector2D: [0.5, 1.2],
    vector3D: [0.4, 1.0, -0.25],
    explanation: 'AI Research and AI Tutorial share direction; they tie on cosine.',
  },
  {
    id: 'five-minute-ai-read',
    label: 'five minute ai read',
    description: 'Same direction as the AI cluster but shorter — same ranking.',
    vector2D: [0.25, 0.6],
    vector3D: [0.2, 0.55, -0.15],
    explanation: 'Demonstrates that ||q|| does not change cosine ranking.',
  },
  {
    id: 'weeknight-dinner',
    label: 'weeknight dinner',
    description: 'Pointed toward Pasta Recipes (opposite side from Sports News).',
    vector2D: [-0.8, -0.5],
    vector3D: [-0.7, -0.3, 0.9],
    explanation: 'Inner product with Sports News is negative.',
  },
  {
    id: 'esports-business',
    label: 'esports business',
    description: 'A topic that sits between sports coverage and tech reporting.',
    vector2D: [1.0, 0.8],
    vector3D: [0.9, 0.7, 0.05],
  },
];

export const PRESET_REJECTION_COPY =
  'This demo only supports preset queries. Arbitrary text embeddings are future work.';

/**
 * Case-insensitive, whitespace-trimmed label match. Returns the preset whose `label` matches
 * `input`, or null. There is no fuzzy matching by design — the UI explicitly tells the user
 * that arbitrary text is not supported.
 */
export function findPresetByLabel(input: string): QueryPreset | null {
  const normalized = input.trim().toLowerCase();
  if (normalized.length === 0) return null;
  return queryPresets.find((p) => p.label.toLowerCase() === normalized) ?? null;
}

/** Find a preset by its stable id (used by setQueryFromPreset). */
export function findPresetById(id: string): QueryPreset | null {
  return queryPresets.find((p) => p.id === id) ?? null;
}
