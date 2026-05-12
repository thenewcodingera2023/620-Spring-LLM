// Toggle + status panel for the MV 2.6 level-set overlay. The actual ray rendering happens in
// EmbeddingPlane2D once the parent flips `showLevelSet` on; this component owns the control UI
// and explains the current state (selected document, current cosine, degenerate handling).

interface LevelSetOverlayProps {
  enabled: boolean;
  onToggle?: (next: boolean) => void;
  /** Cosine of the selected document (drives c). Null when no selection. */
  cosineTarget: number | null;
  /** True when |c| is at or near 1, i.e. the level set degenerates to a single ray. */
  degenerate?: boolean;
  /** Label of the selected document; used in the status caption. */
  selectedLabel?: string | null;
  /** True when the toggle should be disabled (typically because no document is selected). */
  disabled?: boolean;
  /** Active embedding mode. In 3D the overlay is shown as deferred future work. */
  mode?: '2d' | '3d';
}

export function LevelSetOverlay({
  enabled,
  onToggle,
  cosineTarget,
  degenerate = false,
  selectedLabel = null,
  disabled = false,
  mode = '2d',
}: LevelSetOverlayProps) {
  const is3D = mode === '3d';
  const buttonDisabled = is3D || disabled || !onToggle;
  const buttonEnabled = !is3D && enabled;
  const targetText =
    cosineTarget === null || !Number.isFinite(cosineTarget)
      ? '—'
      : (cosineTarget as number).toFixed(3);

  let caption: string;
  if (is3D) {
    caption = 'Level-set cones are future work in 3D. Switch to 2D to view ray pairs.';
  } else if (disabled) {
    caption = 'Select a document to enable the ray-pair overlay at its cosine value.';
  } else if (enabled && degenerate) {
    caption = `c ≈ ±1 for ${selectedLabel ?? 'the selected document'}: the level set degenerates to a single ray. The overlay is suppressed until you move q.`;
  } else if (enabled) {
    caption = 'Two rays are drawn from the origin at angles ±arccos(c) from d. Rotating q radially keeps cos(q, d) at c.';
  } else {
    caption = 'Toggle to overlay the ray pair { q : cos(q, d) = c } in the embedding plane.';
  }

  return (
    <section
      className="panel p-4 flex flex-col gap-2"
      aria-label="Level-set overlay control"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="panel-heading">Level set</h3>
          <p className="text-sm text-ink leading-tight">cos(q, d) = c</p>
        </div>
        <span className="mv-tag">MV 2.6</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={buttonEnabled}
          aria-label={buttonEnabled ? 'Disable level-set overlay' : 'Enable level-set overlay'}
          disabled={buttonDisabled}
          onClick={() => onToggle?.(!enabled)}
          className={[
            'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
            'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            buttonEnabled
              ? 'border-accent-gradient/40 bg-accent-gradient-soft text-accent-gradient'
              : 'border-paper-rule bg-paper-panel text-ink hover:bg-paper-soft',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'inline-block w-2 h-2 rounded-full',
              buttonEnabled ? 'bg-accent-gradient' : 'bg-ink-subtle',
            ].join(' ')}
          />
          {buttonEnabled ? 'On' : 'Off'}
        </button>
        <div className="text-right">
          <div className="text-[0.7rem] uppercase tracking-wide text-ink-subtle font-mono">
            target c
          </div>
          <div className="font-mono text-sm tabular-nums text-ink">{targetText}</div>
        </div>
      </div>

      <p className="text-xs text-ink-subtle leading-relaxed">{caption}</p>
    </section>
  );
}
