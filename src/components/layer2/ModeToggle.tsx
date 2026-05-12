// Stage 6 — 2D / 3D embedding mode toggle.
//
// Presentational. The toggle dispatches setMode on the store; downstream selectors flip from
// (query, documents) to (query3D, documents3D) automatically.

import type { EmbeddingMode } from '../../state/layer2Store';

interface ModeToggleProps {
  mode: EmbeddingMode;
  onChange: (next: EmbeddingMode) => void;
}

const MODES: readonly { id: EmbeddingMode; label: string }[] = [
  { id: '2d', label: '2D' },
  { id: '3d', label: '3D' },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Embedding mode"
      className="inline-flex items-stretch rounded-md border border-paper-rule overflow-hidden"
    >
      {MODES.map((m) => {
        const selected = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={selected}
            aria-label={`Switch to ${m.label} mode`}
            onClick={() => onChange(m.id)}
            className={[
              'px-3 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'bg-accent-forward-soft text-accent-forward'
                : 'bg-paper-panel text-ink-muted hover:bg-paper-soft',
            ].join(' ')}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
