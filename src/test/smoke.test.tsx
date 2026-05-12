import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

describe('App shell', () => {
  it('renders both tab labels', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /Inside the Network/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Finding the Document/i })).toBeInTheDocument();
  });
});

describe('Layer 1 (default tab) initial state', () => {
  it('renders the live network SVG', () => {
    render(<App />);
    expect(
      screen.getByRole('img', { name: /Two-three-two feedforward network/i }),
    ).toBeInTheDocument();
  });

  it('renders the step controller with enabled controls (live, not scaffold)', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^Play$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeEnabled();
    // Back is disabled at step 0; Forward is enabled.
    expect(screen.getByRole('button', { name: /Step back/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Step forward/i })).toBeEnabled();
  });
});

describe('Layer 2 (after switching tabs)', () => {
  it('renders the embedding plane SVG', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Finding the Document/i }));
    expect(
      screen.getByRole('img', { name: /^2D embedding plane$/i }),
    ).toBeInTheDocument();
  });

  it('renders four leaderboard rows', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Finding the Document/i }));
    const ranking = screen.getByLabelText('Document ranking');
    const items = ranking.querySelectorAll('li');
    expect(items.length).toBe(4);
  });
});
