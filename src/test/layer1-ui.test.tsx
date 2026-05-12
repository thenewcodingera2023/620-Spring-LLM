// UI tests for Layer 1's text-to-network pipeline.
// The right-side formula card has been removed; the SVG diagram and inline panels carry the
// visualization. Tests focus on step-controller bounds, in-graph gradient labels, dead-ReLU
// gate behavior, and selection click affordances on the SVG nodes.

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

function clickStepForwardN(n: number) {
  const btn = screen.getByRole('button', { name: /Step forward/i });
  for (let i = 0; i < n; i++) fireEvent.click(btn);
}

describe('Layer 1 step controller', () => {
  it('reports step 0 / 10 on initial render', () => {
    render(<App />);
    expect(screen.getByText(/step 0 \/ 10/)).toBeInTheDocument();
  });

  it('advances the step number when Forward is clicked', () => {
    render(<App />);
    clickStepForwardN(1);
    expect(screen.getByText(/step 1 \/ 10/)).toBeInTheDocument();
    clickStepForwardN(1);
    expect(screen.getByText(/step 2 \/ 10/)).toBeInTheDocument();
  });

  it('rewinds when Back is clicked, and resets to 0 on Reset', () => {
    render(<App />);
    clickStepForwardN(3);
    expect(screen.getByText(/step 3 \/ 10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Step back/i }));
    expect(screen.getByText(/step 2 \/ 10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Reset$/i }));
    expect(screen.getByText(/step 0 \/ 10/)).toBeInTheDocument();
  });

  it('disables Back at step 0 and Forward at step 10', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Step back/i })).toBeDisabled();
    clickStepForwardN(10);
    expect(screen.getByText(/step 10 \/ 10/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Step forward/i })).toBeDisabled();
  });
});

describe('Layer 1 backward gradient labels', () => {
  it('does not render dL/dyHat labels before step 7', () => {
    render(<App />);
    clickStepForwardN(6);
    expect(screen.queryByText(/dL\/dyHat\[0\]=/)).not.toBeInTheDocument();
  });

  it('renders dL/dyHat labels at step 7', () => {
    render(<App />);
    clickStepForwardN(7);
    expect(screen.getAllByText(/dL\/dyHat\[0\]=/).length).toBeGreaterThan(0);
  });

  it('renders dL/dz_1 gate badges starting at step 8', () => {
    render(<App />);
    clickStepForwardN(7);
    expect(screen.queryByText(/dL\/dz_1\[0\]=/)).not.toBeInTheDocument();
    clickStepForwardN(1);
    expect(screen.getAllByText(/dL\/dz_1\[0\]=/).length).toBeGreaterThan(0);
  });

  it('renders the dL/dx node-grad caption only at step 9 or later', () => {
    render(<App />);
    clickStepForwardN(8);
    expect(screen.queryByText(/dL\/dx\[0\]=/)).not.toBeInTheDocument();
    clickStepForwardN(1);
    expect(screen.getAllByText(/dL\/dx\[0\]=/).length).toBeGreaterThan(0);
  });
});

describe('Layer 1 selection clicks are wired', () => {
  it('hidden nodes accept clicks (selection state in store; no UI side panel)', () => {
    render(<App />);
    const hiddenNode0 = screen.getByLabelText('Hidden node 0');
    // The click is a no-op visually beyond the SVG selection ring, but it must not throw.
    expect(() => fireEvent.click(hiddenNode0)).not.toThrow();
  });

  it('loss node accepts clicks', () => {
    render(<App />);
    expect(() => fireEvent.click(screen.getByLabelText('Loss node L'))).not.toThrow();
  });
});
