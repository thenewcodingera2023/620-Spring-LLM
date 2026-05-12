// Layer 2 state hook. Drives the "Finding the Document" visualization.
//
// Math is delegated to src/math/cosine.ts (cosine, gradient, ranking, level-set rays). The hook
// owns interaction state (query, selection, level-set toggle, drag flag, mode, presets) and
// exposes derived values via memoized selectors. The UI never recomputes math; it reads the
// derived fields.
//
// Stage 6 extends this with a `mode: '2d' | '3d'` dimension. Both query states (2D and 3D)
// live side-by-side; the `active*` selectors flip between them based on `mode`. All math
// functions are dimension-agnostic, so the existing memoized derivations work in either mode.
// Preset queries are a UI affordance that pushes a fixed vector through the same setter path.

import { useCallback, useMemo, useState } from 'react';
import {
  queryMagnitudeMax,
  queryMagnitudeMin,
  sampleDocumentAnglesDeg,
  sampleDocumentLabels,
  sampleDocuments,
  sampleDocuments3D,
  sampleQuery,
  sampleQuery3D,
} from '../data/sampleDocuments';
import { findPresetById } from '../data/queryPresets';
import {
  angleBetween,
  cosineScores,
  cosineSimilarity,
  gradCosWrtQ,
  levelSetRays2D,
  rankByCosine,
} from '../math/cosine';
import { norm, vecScale } from '../math/linalg';
import type { Vector } from '../math/types';
import { queryPresets } from '../data/queryPresets';

export const QUERY_MIN = queryMagnitudeMin;
export const QUERY_MAX = queryMagnitudeMax;

/** Tolerance for treating |cos| ≈ 1 as a degenerate level set. */
const DEGENERATE_COS_TOL = 1 - 1e-6;

export type EmbeddingMode = '2d' | '3d';
export type PresetMatchStatus = 'idle' | 'matched' | 'unknown';

/**
 * Clamp a candidate 2D query vector to the locked magnitude range [QUERY_MIN, QUERY_MAX]
 * without ever returning the zero vector. Stage 4/5 behaviour, preserved verbatim.
 *
 * Behaviour:
 *   - if `next` has a finite, non-degenerate norm in [min, max], return it unchanged
 *   - if `next` is below min, scale up along its own direction
 *   - if `next` is above max, scale down along its own direction
 *   - if `next` is the zero vector (or numerically too small to extract a direction), preserve
 *     the previous direction and clamp to min
 *   - if both `next` and `prev` are degenerate, fall back to [QUERY_MIN, 0]
 */
export function clampQuery(next: Vector, prev: Vector): Vector {
  const n = norm(next);
  if (!Number.isFinite(n) || n < 1e-9) {
    const pn = norm(prev);
    if (pn < 1e-9) return [QUERY_MIN, 0];
    return vecScale(prev, QUERY_MIN / pn);
  }
  if (n < QUERY_MIN) return vecScale(next, QUERY_MIN / n);
  if (n > QUERY_MAX) return vecScale(next, QUERY_MAX / n);
  return [next[0], next[1]];
}

/**
 * 3D companion to `clampQuery`. Identical semantics, length-3 fallback.
 */
export function clampQuery3D(next: Vector, prev: Vector): Vector {
  const n = norm(next);
  if (!Number.isFinite(n) || n < 1e-9) {
    const pn = norm(prev);
    if (pn < 1e-9) return [QUERY_MIN, 0, 0];
    return vecScale(prev, QUERY_MIN / pn);
  }
  if (n < QUERY_MIN) return vecScale(next, QUERY_MIN / n);
  if (n > QUERY_MAX) return vecScale(next, QUERY_MAX / n);
  return [next[0], next[1], next[2]];
}

export interface Layer2State {
  // Stage 4/5 fields, preserved for backwards compat with existing components and tests.
  // These always refer to the 2D dimension regardless of mode, so EmbeddingPlane2D continues
  // to read them safely (it is only rendered when mode === '2d').
  documents: readonly Vector[];
  documentLabels: readonly string[];
  documentAnglesDeg: readonly number[];
  query: Vector;
  selectedIndex: number | null;
  showLevelSet: boolean;
  dragging: boolean;

  // Stage 6: dimension-aware state.
  mode: EmbeddingMode;
  query3D: Vector;
  documents3D: readonly Vector[];
  activeQuery: Vector;
  activeDocuments: readonly Vector[];
  activeDimension: 2 | 3;

  // Stage 6: preset state.
  selectedPresetId: string | null;
  typedPresetInput: string;
  presetMatchStatus: PresetMatchStatus;

  // Derived values (compute over active*).
  cosines: readonly number[];
  angles: readonly number[];
  ranking: readonly number[];
  selectedDocument: Vector | null;
  selectedLabel: string | null;
  selectedCosine: number | null;
  selectedAngleRad: number | null;
  selectedGradient: Vector | null;
  selectedLevelSetRays: { ray1: Vector; ray2: Vector } | null;
  selectedLevelSetDegenerate: boolean;

  setQuery(next: Vector): void;
  setQuery3D(next: Vector): void;
  setMode(mode: EmbeddingMode): void;
  setQueryFromPreset(id: string): void;
  setTypedPresetInput(value: string): void;
  clearPresetSelection(): void;
  selectDocument(index: number | null): void;
  setShowLevelSet(value: boolean): void;
  toggleLevelSet(): void;
  startDragging(): void;
  stopDragging(): void;
  resetQuery(): void;

  /** Magnitude clamp constants exposed for UI rendering. */
  readonly clamp: { min: number; max: number };
}

export function useLayer2State(): Layer2State {
  const documents = sampleDocuments;
  const documents3D = sampleDocuments3D;
  const documentLabels = sampleDocumentLabels;
  const documentAnglesDeg = sampleDocumentAnglesDeg;

  const [query, setQueryState] = useState<Vector>(() => sampleQuery.slice());
  const [query3D, setQuery3DState] = useState<Vector>(() => sampleQuery3D.slice());
  const [mode, setModeState] = useState<EmbeddingMode>('2d');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showLevelSet, setShowLevelSetState] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [typedPresetInput, setTypedPresetInputState] = useState<string>('');
  const [presetMatchStatus, setPresetMatchStatus] = useState<PresetMatchStatus>('idle');

  const setQuery = useCallback((next: Vector) => {
    setQueryState((prev) => clampQuery(next, prev));
    setSelectedPresetId(null);
  }, []);

  const setQuery3D = useCallback((next: Vector) => {
    setQuery3DState((prev) => clampQuery3D(next, prev));
    setSelectedPresetId(null);
  }, []);

  const setMode = useCallback((nextMode: EmbeddingMode) => {
    setModeState(nextMode);
    // Mode switch implicitly diverges from any preset selection that targeted the other dim.
    setSelectedPresetId(null);
    // 3D has no level-set overlay; force it off so toggling back to 2D doesn't surprise users.
    if (nextMode === '3d') setShowLevelSetState(false);
  }, []);

  const setQueryFromPreset = useCallback(
    (id: string) => {
      const preset = findPresetById(id);
      if (!preset) return;
      if (mode === '3d') {
        setQuery3DState((prev) => clampQuery3D(preset.vector3D.slice(), prev));
      } else {
        setQueryState((prev) => clampQuery(preset.vector2D.slice(), prev));
      }
      setSelectedPresetId(id);
    },
    [mode],
  );

  const setTypedPresetInput = useCallback((value: string) => {
    setTypedPresetInputState(value);
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      setPresetMatchStatus('idle');
      return;
    }
    const matched = queryPresets.some((p) => p.label.toLowerCase() === normalized);
    setPresetMatchStatus(matched ? 'matched' : 'unknown');
  }, []);

  const clearPresetSelection = useCallback(() => {
    setSelectedPresetId(null);
    setTypedPresetInputState('');
    setPresetMatchStatus('idle');
  }, []);

  const selectDocument = useCallback((index: number | null) => {
    setSelectedIndex((current) => {
      if (index === null) return null;
      if (current === index) return null; // toggle off
      return index;
    });
  }, []);

  const setShowLevelSet = useCallback((value: boolean) => {
    setShowLevelSetState(value);
  }, []);

  const toggleLevelSet = useCallback(() => {
    setShowLevelSetState((s) => !s);
  }, []);

  const startDragging = useCallback(() => setDragging(true), []);
  const stopDragging = useCallback(() => setDragging(false), []);

  const resetQuery = useCallback(() => {
    setQueryState(sampleQuery.slice());
    setQuery3DState(sampleQuery3D.slice());
    setSelectedIndex(null);
    setShowLevelSetState(false);
    setSelectedPresetId(null);
    setTypedPresetInputState('');
    setPresetMatchStatus('idle');
  }, []);

  const activeQuery = mode === '3d' ? query3D : query;
  const activeDocuments = mode === '3d' ? documents3D : documents;
  const activeDimension: 2 | 3 = mode === '3d' ? 3 : 2;

  const cosines = useMemo(
    () => cosineScores(activeQuery, activeDocuments),
    [activeQuery, activeDocuments],
  );
  const angles = useMemo(
    () => activeDocuments.map((d) => angleBetween(activeQuery, d)),
    [activeQuery, activeDocuments],
  );
  const ranking = useMemo(
    () => rankByCosine(activeQuery, activeDocuments),
    [activeQuery, activeDocuments],
  );

  const selectedDocument = useMemo(
    () =>
      selectedIndex !== null && selectedIndex >= 0 && selectedIndex < activeDocuments.length
        ? activeDocuments[selectedIndex]
        : null,
    [activeDocuments, selectedIndex],
  );
  const selectedLabel = useMemo(
    () => (selectedIndex !== null ? documentLabels[selectedIndex] ?? null : null),
    [documentLabels, selectedIndex],
  );

  const selectedCosine = useMemo(
    () => (selectedDocument ? cosineSimilarity(activeQuery, selectedDocument) : null),
    [activeQuery, selectedDocument],
  );
  const selectedAngleRad = useMemo(
    () => (selectedDocument ? angleBetween(activeQuery, selectedDocument) : null),
    [activeQuery, selectedDocument],
  );
  const selectedGradient = useMemo(
    () => (selectedDocument ? gradCosWrtQ(activeQuery, selectedDocument) : null),
    [activeQuery, selectedDocument],
  );

  const selectedLevelSetDegenerate = useMemo(() => {
    if (selectedCosine === null) return false;
    return Math.abs(selectedCosine) >= DEGENERATE_COS_TOL;
  }, [selectedCosine]);

  const selectedLevelSetRays = useMemo(() => {
    if (mode !== '2d') return null;
    if (!selectedDocument || selectedCosine === null) return null;
    if (selectedLevelSetDegenerate) return null;
    return levelSetRays2D(selectedDocument, selectedCosine);
  }, [mode, selectedDocument, selectedCosine, selectedLevelSetDegenerate]);

  return {
    documents,
    documentLabels,
    documentAnglesDeg,
    query,
    selectedIndex,
    showLevelSet,
    dragging,
    mode,
    query3D,
    documents3D,
    activeQuery,
    activeDocuments,
    activeDimension,
    selectedPresetId,
    typedPresetInput,
    presetMatchStatus,
    cosines,
    angles,
    ranking,
    selectedDocument,
    selectedLabel,
    selectedCosine,
    selectedAngleRad,
    selectedGradient,
    selectedLevelSetRays,
    selectedLevelSetDegenerate,
    setQuery,
    setQuery3D,
    setMode,
    setQueryFromPreset,
    setTypedPresetInput,
    clearPresetSelection,
    selectDocument,
    setShowLevelSet,
    toggleLevelSet,
    startDragging,
    stopDragging,
    resetQuery,
    clamp: { min: QUERY_MIN, max: QUERY_MAX },
  };
}
