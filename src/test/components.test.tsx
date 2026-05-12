import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormulaPanel } from '../components/common/FormulaPanel';
import { Leaderboard, type LeaderboardRow } from '../components/layer2/Leaderboard';
import { StepController } from '../components/common/StepController';

describe('FormulaPanel', () => {
  it('renders title and MV tag from props, not from hardcoded text', () => {
    render(<FormulaPanel title="Backward Pass" mvTag="MV 2.4" formula={'\\nabla_q L'} />);
    expect(screen.getByText('Backward Pass')).toBeInTheDocument();
    expect(screen.getByText('MV 2.4')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<FormulaPanel title="t" description="custom description here" />);
    expect(screen.getByText('custom description here')).toBeInTheDocument();
  });

  it('renders a numeric preview block when given numericPreview', () => {
    render(
      <FormulaPanel
        title="t"
        formula="x = 1"
        numericPreview={{ a: 1.234, v: [0.5, -0.3], note: 'literal' }}
      />,
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('v')).toBeInTheDocument();
    expect(screen.getByText('literal')).toBeInTheDocument();
  });

  it('renders nothing when all props are empty', () => {
    const { container } = render(<FormulaPanel />);
    expect(container.querySelector('aside')).toBeNull();
  });
});

describe('Leaderboard', () => {
  const rows: LeaderboardRow[] = [
    { index: 0, label: 'd_0', cosine: 1.0, caption: 'angle 0°' },
    { index: 1, label: 'd_1', cosine: null, caption: 'angle 60°' },
  ];

  it('renders the rows it is given without computing anything', () => {
    render(<Leaderboard rows={rows} />);
    expect(screen.getByText('d_0')).toBeInTheDocument();
    expect(screen.getByText('d_1')).toBeInTheDocument();
    expect(screen.getByText('1.000')).toBeInTheDocument();
    // null cosine renders as em dash placeholder
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('calls onSelect when a row is clicked, in interactive mode', () => {
    const onSelect = vi.fn();
    render(<Leaderboard rows={rows} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('d_1'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('disables row buttons when no onSelect is provided', () => {
    render(<Leaderboard rows={rows} />);
    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});

describe('StepController', () => {
  it('renders disabled in scaffold mode', () => {
    render(<StepController currentStep={0} maxStep={5} disabled />);
    expect(screen.getByRole('button', { name: /^Play$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeDisabled();
  });

  it('reflects current and max steps in the readout', () => {
    render(<StepController currentStep={3} maxStep={7} disabled />);
    expect(screen.getByText(/step 3 \/ 7/)).toBeInTheDocument();
  });
});
