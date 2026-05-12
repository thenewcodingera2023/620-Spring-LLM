// Stage 5 final-verification tests.
// These cross both layers and assert (a) no stale Stage 2 placeholder copy survives in the
// rendered pages, (b) numeric values displayed in the UI come from the tested math engine,
// and (c) tab switching leaves both layers functional.

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { sampleInputText, sampleSpec, sampleTarget } from '../data/sampleNetwork';
import { sampleDocumentLabels, sampleDocuments, sampleQuery } from '../data/sampleDocuments';
import { TOKEN_ID_NORMALIZER, tokenize } from '../data/tokenizer';
import { cosineScores } from '../math/cosine';
import { forward } from '../math/network';
import { encodeTokens } from '../math/tokenEncoding';

function openLayer2() {
  fireEvent.click(screen.getByRole('tab', { name: /Finding the Document/i }));
}

function openLayer1() {
  fireEvent.click(screen.getByRole('tab', { name: /Inside the Network/i }));
}

describe('Stage 5 · stale-copy guards', () => {
  // Layer 1 page on initial render.
  it('Layer 1 page contains no Stage 2 scaffold-only copy', () => {
    render(<App />);
    expect(screen.queryByText(/network graph placeholder/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stage 3 will/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scaffold preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/will be connected/i)).not.toBeInTheDocument();
  });

  it('Layer 2 page contains no Stage 2 scaffold-only copy', () => {
    render(<App />);
    openLayer2();
    expect(screen.queryByText(/embedding plane placeholder/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stage 4 will/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scaffold preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/will be connected/i)).not.toBeInTheDocument();
  });

});

describe('Stage 5 · numeric values come from the math engine', () => {
  it('Layer 1: the loss-node SVG value at step 6 matches forward(spec, x_live, y).loss', () => {
    // The UI derives x from the default text via the live tokenizer + encodeTokens pipeline.
    // The loss node in the network SVG displays the value via fmt(): sign + toFixed(3).
    const { ids } = tokenize(sampleInputText);
    const { x: xLive } = encodeTokens(ids, TOKEN_ID_NORMALIZER);
    const liveLoss = forward(sampleSpec, xLive, sampleTarget).loss;
    const formatted = (liveLoss >= 0 ? '+' : '') + liveLoss.toFixed(3);
    render(<App />);
    const fwdBtn = screen.getByRole('button', { name: /Step forward/i });
    for (let i = 0; i < 6; i++) fireEvent.click(fwdBtn);
    expect(screen.getAllByText(formatted).length).toBeGreaterThan(0);
  });

  it('Layer 2: top of the leaderboard reflects cosineScores(initialQuery, documents)', () => {
    const cosines = cosineScores(sampleQuery, sampleDocuments);
    const topCosine = cosines[0].toFixed(3); // index 0 with q=[1,0] gives 1.000
    render(<App />);
    openLayer2();
    const ranking = screen.getByLabelText('Document ranking');
    const buttons = within(ranking).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent(sampleDocumentLabels[0]);
    expect(buttons[0]).toHaveTextContent(topCosine);
  });
});

describe('Stage 5 · cross-layer integration', () => {
  it('switching Layer 1 → Layer 2 → Layer 1 leaves both layers fully functional', () => {
    render(<App />);
    // Default Layer 1: step 0 with the network SVG and text input rendered.
    expect(screen.getByRole('img', { name: /Two-three-two feedforward network/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Layer 1 text input/i)).toBeInTheDocument();

    // Switch to Layer 2.
    openLayer2();
    expect(screen.getByRole('img', { name: /^2D embedding plane$/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Document ranking')).toBeInTheDocument();

    // Switch back to Layer 1; state resets (separate hook on each mount).
    openLayer1();
    expect(screen.getByLabelText(/Layer 1 text input/i)).toBeInTheDocument();
    expect(screen.getByText(/step 0 \/ 10/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Two-three-two feedforward network/i }),
    ).toBeInTheDocument();
  });

  it('both tab triggers are reachable and have correct ARIA roles', () => {
    render(<App />);
    const tab1 = screen.getByRole('tab', { name: /Inside the Network/i });
    const tab2 = screen.getByRole('tab', { name: /Finding the Document/i });
    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab2).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(tab2);
    expect(tab1).toHaveAttribute('aria-selected', 'false');
    expect(tab2).toHaveAttribute('aria-selected', 'true');
  });
});

