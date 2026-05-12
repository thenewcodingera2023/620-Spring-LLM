// Locked Layer 2 example for "Calculus Inside the Machine".
//
// Documents are records that carry both their 2D and 3D vectors plus a stable id, label, and
// short description. Flat arrays (`sampleDocuments`, `sampleDocuments3D`) are derived for
// backwards compatibility with Stage 4/5 callers and tests.
//
// 2D layout (unchanged from Stage 1): four documents at fixed angles around the origin, with
// one chosen at a different magnitude so the student can see that cosine ranking is determined
// by direction only.
//
// 3D layout (new in Stage 6): d_1 and d_2 share direction but differ in magnitude — preserving
// the "ranking depends on direction, not magnitude" teaching point in 3D as well.

import type { Vector } from '../math/types';

export const sampleDocumentAnglesDeg: readonly number[] = [0, 60, 135, 220];
export const sampleDocumentMagnitudes: readonly number[] = [1.5, 1.5, 0.8, 1.5];

function fromPolarDeg(magnitude: number, angleDeg: number): Vector {
  const t = (angleDeg * Math.PI) / 180;
  return [magnitude * Math.cos(t), magnitude * Math.sin(t)];
}

export interface RetrievalDocument {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly vector2D: Vector;
  readonly vector3D: Vector;
}

// Concrete scenario: a small news search engine. The query represents what a reader is
// looking for; each document is an article in the archive. Labels are intentionally
// recognizable so the cosine-ranking lesson lands without abstract symbols.
//
// "AI Tutorial" intentionally shares a direction with "AI Research" in 3D (a short and a
// long article about the same topic) so the "magnitude doesn't change ranking" point is
// still demonstrable.
export const retrievalDocuments: readonly RetrievalDocument[] = [
  {
    id: 'd_0',
    label: 'Sports News',
    description: 'Match recaps, scores, and league coverage.',
    vector2D: fromPolarDeg(sampleDocumentMagnitudes[0], sampleDocumentAnglesDeg[0]),
    vector3D: [1.2, 0.6, 0.2],
  },
  {
    id: 'd_1',
    label: 'AI Research',
    description: 'In-depth articles on machine-learning advances.',
    vector2D: fromPolarDeg(sampleDocumentMagnitudes[1], sampleDocumentAnglesDeg[1]),
    vector3D: [0.4, 1.1, -0.3],
  },
  {
    id: 'd_2',
    label: 'AI Tutorial',
    description: 'Short explainers on the same topics as AI Research.',
    vector2D: fromPolarDeg(sampleDocumentMagnitudes[2], sampleDocumentAnglesDeg[2]),
    vector3D: [0.2, 0.55, -0.15],
  },
  {
    id: 'd_3',
    label: 'Pasta Recipes',
    description: 'Weeknight pasta dishes and cooking tips.',
    vector2D: fromPolarDeg(sampleDocumentMagnitudes[3], sampleDocumentAnglesDeg[3]),
    vector3D: [-0.8, -0.3, 1.0],
  },
];

export const sampleDocuments: readonly Vector[] = retrievalDocuments.map((d) => d.vector2D);
export const sampleDocuments3D: readonly Vector[] = retrievalDocuments.map((d) => d.vector3D);
export const sampleDocumentLabels: readonly string[] = retrievalDocuments.map((d) => d.label);

export const sampleQuery: Vector = [1, 0];
export const sampleQuery3D: Vector = [1, 0.4, 0.2];

/** UI clamp on ||q|| (kept here as the single source of truth for the layer-2 store). */
export const queryMagnitudeMin = 0.1;
export const queryMagnitudeMax = 3.0;
