// Step controller: a row of buttons (Reset, Step Back, Play/Pause, Step Forward) plus a scrubber
// representing position in the animation timeline. The component is prop-driven and stays
// disabled if its callbacks are omitted, which makes it safe to render before state is wired.

import type { ReactNode } from 'react';

interface StepControllerProps {
  /** Current step index, 0..maxStep. */
  currentStep: number;
  /** Highest valid step index. */
  maxStep: number;
  /** True while the animation is playing. */
  isPlaying?: boolean;
  /** True to render the controller as read-only (all buttons disabled). */
  disabled?: boolean;
  onReset?: () => void;
  onStepBack?: () => void;
  onPlayPause?: () => void;
  onStepForward?: () => void;
  onScrub?: (step: number) => void;
  /** Optional caption rendered below the buttons. */
  caption?: ReactNode;
}

const buttonClass =
  'inline-flex items-center justify-center rounded-md border border-paper-rule ' +
  'bg-paper-panel px-3 py-1.5 text-sm font-medium text-ink ' +
  'hover:bg-paper-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export function StepController({
  currentStep,
  maxStep,
  isPlaying = false,
  disabled = false,
  onReset,
  onStepBack,
  onPlayPause,
  onStepForward,
  onScrub,
  caption,
}: StepControllerProps) {
  const buttonsDisabled = disabled || (!onStepBack && !onPlayPause && !onStepForward && !onReset);
  const safeMax = Math.max(0, maxStep);

  return (
    <div className="panel p-4 flex flex-col gap-3" aria-label="Step controller">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={onReset}
          disabled={buttonsDisabled}
          aria-label="Reset"
        >
          Reset
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={onStepBack}
          disabled={buttonsDisabled || currentStep <= 0}
          aria-label="Step back"
        >
          ‹ Back
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={onPlayPause}
          disabled={buttonsDisabled}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={onStepForward}
          disabled={buttonsDisabled || currentStep >= safeMax}
          aria-label="Step forward"
        >
          Forward ›
        </button>

        <div className="ml-auto font-mono text-xs text-ink-muted tabular-nums">
          step {currentStep} / {safeMax}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={safeMax}
          step={1}
          value={Math.min(Math.max(currentStep, 0), safeMax)}
          onChange={onScrub ? (event) => onScrub(Number(event.target.value)) : undefined}
          disabled={buttonsDisabled}
          aria-label="Step scrubber"
          className="w-full accent-accent-forward"
        />
      </div>

      {caption ? <div className="text-xs text-ink-subtle">{caption}</div> : null}
    </div>
  );
}
