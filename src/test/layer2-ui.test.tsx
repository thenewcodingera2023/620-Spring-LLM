// Stage 4 tests for Layer 2.
//
// We test (a) the clamp helper and useLayer2State hook directly via renderHook, and
// (b) the page-level visible behaviour: leaderboard order, selection, chain-rule live values,
// level-set toggle. Drag-by-pointer in jsdom is fragile because layout is missing, so we
// exercise setQuery via the hook instead and verify that downstream UI reflects the change.

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import App from '../App';
import { sampleDocumentLabels, sampleDocuments } from '../data/sampleDocuments';
import { norm } from '../math/linalg';
import { clampQuery, QUERY_MAX, QUERY_MIN, useLayer2State } from '../state/layer2Store';

function openLayer2() {
  fireEvent.click(screen.getByRole('tab', { name: /Finding the Document/i }));
}

describe('clampQuery helper', () => {
  it('passes through a vector inside the magnitude band', () => {
    const out = clampQuery([2, 0], [1, 0]);
    expect(out).toEqual([2, 0]);
  });

  it('clamps a too-small magnitude up to QUERY_MIN', () => {
    const out = clampQuery([0.05, 0], [1, 0]);
    expect(norm(out)).toBeCloseTo(QUERY_MIN, 6);
    // Direction preserved.
    expect(out[0]).toBeGreaterThan(0);
    expect(out[1]).toBeCloseTo(0, 9);
  });

  it('clamps a too-large magnitude down to QUERY_MAX', () => {
    const out = clampQuery([10, 0], [1, 0]);
    expect(norm(out)).toBeCloseTo(QUERY_MAX, 6);
    expect(out[0]).toBeGreaterThan(0);
  });

  it('falls back to previous direction when next is the zero vector', () => {
    const out = clampQuery([0, 0], [1, 0]);
    expect(out).toEqual([QUERY_MIN, 0]);
  });

  it('falls back to [QUERY_MIN, 0] when both prev and next are degenerate', () => {
    const out = clampQuery([0, 0], [0, 0]);
    expect(out).toEqual([QUERY_MIN, 0]);
  });

  it('preserves a 2D direction other than the x-axis', () => {
    const out = clampQuery([0.03, 0.04], [1, 0]); // norm 0.05 < min
    expect(norm(out)).toBeCloseTo(QUERY_MIN, 6);
    // Direction proportional to (3, 4).
    expect(out[0] / out[1]).toBeCloseTo(0.03 / 0.04, 6);
  });
});

describe('useLayer2State derivations', () => {
  it('returns the initial query [1, 0] and ranking [0, 1, 2, 3]', () => {
    const { result } = renderHook(() => useLayer2State());
    expect(result.current.query).toEqual([1, 0]);
    expect(result.current.ranking).toEqual([0, 1, 2, 3]);
  });

  it('cosine of d_0 with q=[1,0] equals 1 to numerical precision', () => {
    const { result } = renderHook(() => useLayer2State());
    expect(result.current.cosines[0]).toBeCloseTo(1, 12);
  });

  it('rotating q to [-1, 0] makes d_3 the top-1 (it is the closest by angle)', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setQuery([-1, 0]));
    expect(result.current.ranking[0]).toBe(3);
  });

  it('selectDocument toggles off when the same index is clicked twice', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.selectDocument(1));
    expect(result.current.selectedIndex).toBe(1);
    act(() => result.current.selectDocument(1));
    expect(result.current.selectedIndex).toBeNull();
  });

  it('exposes a non-null gradient and level-set ray pair when q is not parallel to d', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.selectDocument(1)); // d_1 at 60°, cos = 0.5 with q=[1,0]
    expect(result.current.selectedGradient).not.toBeNull();
    expect(result.current.selectedLevelSetRays).not.toBeNull();
    expect(result.current.selectedLevelSetDegenerate).toBe(false);
  });

  it('flags the level set as degenerate when q is parallel to the selected document', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.selectDocument(0)); // q=[1,0] parallel to d_0=[1.5,0] → cos=1
    expect(result.current.selectedLevelSetDegenerate).toBe(true);
    expect(result.current.selectedLevelSetRays).toBeNull();
  });

  it('setQuery applies the clamp', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => result.current.setQuery([0.05, 0]));
    expect(norm(result.current.query)).toBeCloseTo(QUERY_MIN, 6);
    act(() => result.current.setQuery([10, 0]));
    expect(norm(result.current.query)).toBeCloseTo(QUERY_MAX, 6);
    act(() => result.current.setQuery([0, 0]));
    expect(norm(result.current.query)).toBeCloseTo(QUERY_MIN, 6);
  });

  it('resetQuery returns to the initial sample query and clears selection', () => {
    const { result } = renderHook(() => useLayer2State());
    act(() => {
      result.current.setQuery([2.5, 1]);
      result.current.selectDocument(2);
      result.current.toggleLevelSet();
    });
    expect(result.current.selectedIndex).toBe(2);
    act(() => result.current.resetQuery());
    expect(result.current.query).toEqual([1, 0]);
    expect(result.current.selectedIndex).toBeNull();
    expect(result.current.showLevelSet).toBe(false);
  });
});

describe('Layer 2 page · initial render', () => {
  it('renders the embedding plane and the four document labels', () => {
    render(<App />);
    openLayer2();
    expect(screen.getByRole('img', { name: /^2D embedding plane$/i })).toBeInTheDocument();
    for (let i = 0; i < sampleDocuments.length; i++) {
      // Document labels appear both on the plane and in the leaderboard, so use getAllByText.
      expect(screen.getAllByText(sampleDocumentLabels[i]).length).toBeGreaterThan(0);
    }
  });

  it('renders four leaderboard rows in initial cosine-descending order', () => {
    render(<App />);
    openLayer2();
    const ranking = screen.getByLabelText('Document ranking');
    const buttons = within(ranking).getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent(sampleDocumentLabels[0]);
    expect(buttons[1]).toHaveTextContent(sampleDocumentLabels[1]);
    expect(buttons[2]).toHaveTextContent(sampleDocumentLabels[2]);
    expect(buttons[3]).toHaveTextContent(sampleDocumentLabels[3]);
  });
});

describe('Layer 2 page · selection updates', () => {
  it('the cosine MetricCard shows the live cosine value to 3 decimals', () => {
    render(<App />);
    openLayer2();
    const ranking = screen.getByLabelText('Document ranking');
    const buttons = within(ranking).getAllByRole('button');
    fireEvent.click(buttons[1]); // index 1 article, cos = 0.5 with q=[1,0]
    expect(screen.getAllByText(/0\.500/).length).toBeGreaterThan(0);
  });

  it('clicking the same leaderboard row again deselects it', () => {
    render(<App />);
    openLayer2();
    const ranking = screen.getByLabelText('Document ranking');
    const buttons = within(ranking).getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(buttons[2]);
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'false');
  });
});
