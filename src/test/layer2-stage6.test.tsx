// Stage 6 — state, store, and component-level tests for preset queries and 3D mode.
//
// WebGL is unavailable in jsdom. We mock @react-three/fiber so that `<Canvas>` (and the rest of
// the R3F surface used by EmbeddingSpace3D) renders into plain divs. That lets us assert the
// scene mounts in 3D mode without depending on a real renderer.

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';

// Mock @react-three/fiber + three before importing anything that touches the 3D scene. The
// mocks render children as plain divs and return inert objects from three.js constructors.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'r3f-canvas' }, children),
}));

vi.mock('three', () => {
  class V3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    copy(v: V3) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
    multiplyScalar(s: number) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
    add(v: V3) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    length() {
      return Math.hypot(this.x, this.y, this.z);
    }
    normalize() {
      const l = this.length();
      if (l > 0) this.multiplyScalar(1 / l);
      return this;
    }
  }
  class Quat {
    setFromUnitVectors(_a: V3, _b: V3) {
      return this;
    }
  }
  class Euler {
    setFromQuaternion(_q: Quat) {
      return this;
    }
  }
  class CanvasTexture {
    needsUpdate = false;
    dispose() {
      /* noop */
    }
  }
  return {
    Vector3: V3,
    Quaternion: Quat,
    Euler,
    CanvasTexture,
  };
});

import App from '../App';
import { queryPresets, PRESET_REJECTION_COPY } from '../data/queryPresets';
import { cosineScores, gradCosWrtQ, rankByCosine } from '../math/cosine';
import { norm } from '../math/linalg';
import {
  QUERY_MAX,
  QUERY_MIN,
  clampQuery3D,
  useLayer2State,
} from '../state/layer2Store';
import { sampleDocumentLabels, sampleDocuments3D, sampleQuery3D } from '../data/sampleDocuments';

function openLayer2() {
  fireEvent.click(screen.getByRole('tab', { name: /Finding the Document/i }));
}

describe('clampQuery3D', () => {
  it('passes a length-3 vector inside the band through unchanged', () => {
    const out = clampQuery3D([1, 0.5, -0.3], [1, 0, 0]);
    expect(out).toEqual([1, 0.5, -0.3]);
  });

  it('clamps a small magnitude up to QUERY_MIN, preserving direction', () => {
    const out = clampQuery3D([0.02, 0.02, 0.02], [1, 0, 0]);
    expect(norm(out)).toBeCloseTo(QUERY_MIN, 6);
    expect(out[0]).toBeCloseTo(out[1], 6);
    expect(out[1]).toBeCloseTo(out[2], 6);
  });

  it('clamps a large magnitude down to QUERY_MAX', () => {
    const out = clampQuery3D([10, 0, 0], [1, 0, 0]);
    expect(norm(out)).toBeCloseTo(QUERY_MAX, 6);
    expect(out[0]).toBeGreaterThan(0);
  });

  it('falls back to previous direction when next is zero', () => {
    const out = clampQuery3D([0, 0, 0], [0, 1, 0]);
    expect(norm(out)).toBeCloseTo(QUERY_MIN, 6);
    expect(out[1]).toBeCloseTo(QUERY_MIN, 6);
  });

  it('falls back to [QUERY_MIN, 0, 0] when both prev and next are degenerate', () => {
    const out = clampQuery3D([0, 0, 0], [0, 0, 0]);
    expect(out).toEqual([QUERY_MIN, 0, 0]);
  });
});

describe('useLayer2State · mode + active selectors', () => {
  it('starts in 2D mode with the sample 2D query', () => {
    const { result } = renderHook(() => useLayer2State());
    expect(result.current.mode).toBe('2d');
    expect(result.current.activeQuery).toEqual([1, 0]);
    expect(result.current.activeDimension).toBe(2);
    expect(result.current.activeDocuments[0]).toHaveLength(2);
  });

  it('setMode("3d") flips activeQuery and activeDocuments to length 3', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    expect(result.current.mode).toBe('3d');
    expect(result.current.activeDimension).toBe(3);
    expect(result.current.activeQuery).toEqual(sampleQuery3D);
    expect(result.current.activeDocuments[0]).toHaveLength(3);
    expect(result.current.cosines).toHaveLength(4);
    expect(result.current.ranking).toHaveLength(4);
  });

  it('3D ranking matches a direct rankByCosine over 3D data', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    const expected = rankByCosine(sampleQuery3D, sampleDocuments3D);
    expect([...result.current.ranking]).toEqual(expected);
    const expectedCos = cosineScores(sampleQuery3D, sampleDocuments3D);
    for (let i = 0; i < expectedCos.length; i++) {
      expect(result.current.cosines[i]).toBeCloseTo(expectedCos[i], 12);
    }
  });

  it('selectedGradient in 3D is length-3 and equals gradCosWrtQ', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    act(() => result.current.selectDocument(0));
    const g = result.current.selectedGradient;
    expect(g).not.toBeNull();
    expect(g!).toHaveLength(3);
    const expected = gradCosWrtQ(sampleQuery3D, sampleDocuments3D[0]);
    for (let i = 0; i < 3; i++) expect(g![i]).toBeCloseTo(expected[i], 12);
  });

  it('setQuery3D applies the 3D clamp', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    act(() => result.current.setQuery3D([10, 0, 0]));
    expect(norm(result.current.query3D)).toBeCloseTo(QUERY_MAX, 6);
    act(() => result.current.setQuery3D([0.01, 0.01, 0.01]));
    expect(norm(result.current.query3D)).toBeCloseTo(QUERY_MIN, 6);
  });

  it('selectedLevelSetRays is null in 3D regardless of selection', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    act(() => result.current.selectDocument(0));
    expect(result.current.selectedLevelSetRays).toBeNull();
  });

  it('switching back to 2D preserves the 2D query', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setQuery([0.5, 0.5]));
    act(() => result.current.setMode('3d'));
    act(() => result.current.setMode('2d'));
    expect(result.current.activeQuery).toEqual(result.current.query);
    expect(result.current.activeDimension).toBe(2);
  });

  it('mode switch forces level-set overlay off', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.selectDocument(1));
    act(() => result.current.toggleLevelSet());
    expect(result.current.showLevelSet).toBe(true);
    act(() => result.current.setMode('3d'));
    expect(result.current.showLevelSet).toBe(false);
  });
});

describe('useLayer2State · presets', () => {
  it('setQueryFromPreset in 2D writes the preset vector2D', () => {
    const { result } = renderHook(() => useLayer2State());
    const preset = queryPresets[0];
    act(() => result.current.setQueryFromPreset(preset.id));
    expect(result.current.selectedPresetId).toBe(preset.id);
    // preset vectors are within [0.1, 3.0], so clamp passes them through
    expect(result.current.query).toEqual(preset.vector2D);
  });

  it('setQueryFromPreset in 3D writes the preset vector3D', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    const preset = queryPresets[1];
    act(() => result.current.setQueryFromPreset(preset.id));
    expect(result.current.selectedPresetId).toBe(preset.id);
    expect(result.current.query3D).toEqual(preset.vector3D);
    // The ranking should match rankByCosine over the preset vector
    expect([...result.current.ranking]).toEqual(rankByCosine(preset.vector3D, sampleDocuments3D));
  });

  it('drag via setQuery after preset clears selectedPresetId', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setQueryFromPreset(queryPresets[0].id));
    expect(result.current.selectedPresetId).not.toBeNull();
    act(() => result.current.setQuery([2, 0]));
    expect(result.current.selectedPresetId).toBeNull();
  });

  it('slider via setQuery3D after preset clears selectedPresetId', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    act(() => result.current.setQueryFromPreset(queryPresets[1].id));
    expect(result.current.selectedPresetId).not.toBeNull();
    act(() => result.current.setQuery3D([1, 0, 0]));
    expect(result.current.selectedPresetId).toBeNull();
  });

  it('unknown preset id is a no-op', () => {
    const { result } = renderHook(() => useLayer2State());
    const before = result.current.query;
    act(() => result.current.setQueryFromPreset('nope-not-a-preset'));
    expect(result.current.query).toEqual(before);
    expect(result.current.selectedPresetId).toBeNull();
  });

  it('setTypedPresetInput transitions through idle/matched/unknown', () => {
    const { result } = renderHook(() => useLayer2State());
    expect(result.current.presetMatchStatus).toBe('idle');
    act(() => result.current.setTypedPresetInput('asdf'));
    expect(result.current.presetMatchStatus).toBe('unknown');
    act(() => result.current.setTypedPresetInput(queryPresets[0].label.toUpperCase()));
    expect(result.current.presetMatchStatus).toBe('matched');
    act(() => result.current.setTypedPresetInput(''));
    expect(result.current.presetMatchStatus).toBe('idle');
  });

  it('resetQuery resets both query dimensions and clears the preset', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setMode('3d'));
    act(() => result.current.setQueryFromPreset(queryPresets[2].id));
    act(() => result.current.setQuery3D([2, 0, 0]));
    expect(result.current.selectedPresetId).toBeNull();
    act(() => result.current.resetQuery());
    expect(result.current.query).toEqual([1, 0]);
    expect(result.current.query3D).toEqual(sampleQuery3D);
    expect(result.current.selectedPresetId).toBeNull();
    expect(result.current.presetMatchStatus).toBe('idle');
    // mode is preserved across reset
    expect(result.current.mode).toBe('3d');
  });
});

describe('Layer 2 page · preset query panel', () => {
  it('renders one button per preset and the no-model disclaimer', () => {
    render(<App />);
    openLayer2();
    const panel = screen.getByLabelText('Preset query panel');
    for (const preset of queryPresets) {
      expect(within(panel).getByRole('button', { name: preset.label })).toBeInTheDocument();
    }
    expect(within(panel).getByText(/No model is run/i)).toBeInTheDocument();
  });

  it('clicking a preset updates the leaderboard ranking', () => {
    render(<App />);
    openLayer2();
    const panel = screen.getByLabelText('Preset query panel');
    // "llm breakthroughs" points near the AI cluster (index 1 / 2)
    fireEvent.click(within(panel).getByRole('button', { name: 'llm breakthroughs' }));
    const ranking = screen.getByLabelText('Document ranking');
    const buttons = within(ranking).getAllByRole('button');
    const top = buttons[0].textContent ?? '';
    expect(
      top.includes(sampleDocumentLabels[1]) || top.includes(sampleDocumentLabels[2]),
    ).toBe(true);
  });

  it('typing an unknown query shows the rejection copy and keeps Apply disabled', () => {
    render(<App />);
    openLayer2();
    const input = screen.getByLabelText('Preset query input');
    fireEvent.change(input, { target: { value: 'puppy' } });
    expect(screen.getByText(PRESET_REJECTION_COPY)).toBeInTheDocument();
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toBeDisabled();
  });

  it('typing a known preset label enables Apply, and Apply pushes the vector', () => {
    render(<App />);
    openLayer2();
    const input = screen.getByLabelText('Preset query input');
    fireEvent.change(input, { target: { value: 'world cup recap' } });
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toBeEnabled();
    fireEvent.click(apply);
    // index 0 article should be top-1 after applying "world cup recap".
    const ranking = screen.getByLabelText('Document ranking');
    const buttons = within(ranking).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent(sampleDocumentLabels[0]);
  });
});

describe('Layer 2 page · mode toggle', () => {
  it('defaults to 2D and renders EmbeddingPlane2D, not the 3D canvas', () => {
    render(<App />);
    openLayer2();
    expect(screen.getByRole('img', { name: /^2D embedding plane$/i })).toBeInTheDocument();
    expect(screen.queryByTestId('r3f-canvas')).not.toBeInTheDocument();
  });

  it('switching to 3D unmounts the 2D plane and mounts the 3D canvas', async () => {
    render(<App />);
    openLayer2();
    const toggle = screen.getByRole('button', { name: /Switch to 3D mode/i });
    fireEvent.click(toggle);
    expect(await screen.findByTestId('r3f-canvas', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /^2D embedding plane$/i })).not.toBeInTheDocument();
    // 3D slider controls are visible
    expect(screen.getByLabelText('Query component x_1')).toBeInTheDocument();
    expect(screen.getByLabelText('Query component x_2')).toBeInTheDocument();
    expect(screen.getByLabelText('Query component x_3')).toBeInTheDocument();
  });

  it('clicking 3D updates aria-pressed on the toggle', () => {
    render(<App />);
    openLayer2();
    const toggle3D = screen.getByRole('button', { name: /Switch to 3D mode/i });
    const toggle2D = screen.getByRole('button', { name: /Switch to 2D mode/i });
    expect(toggle2D).toHaveAttribute('aria-pressed', 'true');
    expect(toggle3D).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle3D);
    expect(toggle3D).toHaveAttribute('aria-pressed', 'true');
    expect(toggle2D).toHaveAttribute('aria-pressed', 'false');
  });

  it('moving an x slider in 3D reorders the leaderboard', async () => {
    render(<App />);
    openLayer2();
    fireEvent.click(screen.getByRole('button', { name: /Switch to 3D mode/i }));
    await screen.findByTestId('r3f-canvas');

    // Push query strongly toward -x; the Pasta Recipes article (with -x dominant) should rise.
    const xSlider = screen.getByLabelText('Query component x_1') as HTMLInputElement;
    fireEvent.change(xSlider, { target: { value: '-2.5' } });
    const ySlider = screen.getByLabelText('Query component x_2') as HTMLInputElement;
    fireEvent.change(ySlider, { target: { value: '-0.5' } });
    const zSlider = screen.getByLabelText('Query component x_3') as HTMLInputElement;
    fireEvent.change(zSlider, { target: { value: '0.5' } });

    const ranking = screen.getByLabelText('Document ranking');
    const buttons = within(ranking).getAllByRole('button');
    // Compute expected ranking with the math engine to keep this honest.
    const q3 = [-2.5, -0.5, 0.5];
    const expected = rankByCosine(q3, sampleDocuments3D);
    expect(buttons[0]).toHaveTextContent(sampleDocumentLabels[expected[0]]);
  });
});
