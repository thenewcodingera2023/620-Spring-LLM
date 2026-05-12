// Stage 6A — Preset query panel.
//
// Lets the user pick a preset prompt (or type one of the known labels) to push a FIXED demo
// vector into the query. There is no embedding model, no API call, no learned representation.
// Unknown typed input shows a clear rejection message and the Apply button stays disabled.
//
// Each preset is defined in src/data/queryPresets.ts with its 2D and 3D vector pre-baked. The
// store decides which one to apply based on the active embedding mode; the user-facing UI
// looks the same in both dimensions.

import { useMemo } from 'react';
import {
  PRESET_REJECTION_COPY,
  findPresetByLabel,
  queryPresets,
} from '../../data/queryPresets';
import type { Layer2State } from '../../state/layer2Store';

interface QueryPresetPanelProps {
  state: Layer2State;
}

export function QueryPresetPanel({ state }: QueryPresetPanelProps) {
  const {
    mode,
    selectedPresetId,
    typedPresetInput,
    presetMatchStatus,
    setQueryFromPreset,
    setTypedPresetInput,
  } = state;

  const matched = useMemo(() => findPresetByLabel(typedPresetInput), [typedPresetInput]);
  const canApply = presetMatchStatus === 'matched' && matched !== null;

  return (
    <section
      className="panel p-4 flex flex-col gap-3"
      aria-label="Preset query panel"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="panel-heading">Try a search</h3>
          <p className="text-xs text-ink-muted">
            Pick what a reader might type — watch how the article ranking shifts.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Preset query options">
        {queryPresets.map((preset) => {
          const selected = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setQueryFromPreset(preset.id)}
              title={preset.description}
              className={[
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'border-accent-forward/40 bg-accent-forward-soft text-accent-forward'
                  : 'border-paper-rule bg-paper-panel text-ink hover:bg-paper-soft',
              ].join(' ')}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[0.7rem] uppercase tracking-wide text-ink-subtle font-mono">
          or type a preset label
        </label>
        <div className="flex gap-2 items-stretch">
          <input
            type="text"
            value={typedPresetInput}
            onChange={(e) => setTypedPresetInput(e.target.value)}
            placeholder="world cup recap, weeknight dinner, …"
            aria-label="Preset query input"
            className="flex-1 rounded-md border border-paper-rule bg-paper-panel px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-forward/40"
          />
          <button
            type="button"
            disabled={!canApply}
            onClick={() => {
              if (matched) setQueryFromPreset(matched.id);
            }}
            className={[
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              canApply
                ? 'border-accent-forward/40 bg-accent-forward-soft text-accent-forward'
                : 'border-paper-rule bg-paper-panel text-ink-muted',
            ].join(' ')}
          >
            Apply
          </button>
        </div>
        {presetMatchStatus === 'unknown' ? (
          <p
            role="alert"
            className="text-xs text-accent-backward"
          >
            {PRESET_REJECTION_COPY}
          </p>
        ) : null}
        {presetMatchStatus === 'matched' && matched ? (
          <p className="text-xs text-ink-muted">
            Matched <span className="font-mono">{matched.label}</span> · {matched.description}
          </p>
        ) : null}
      </div>

      <p className="text-[0.7rem] text-ink-subtle">
        Presets map to fixed demo vectors. No model is run. Active dimension:{' '}
        <span className="font-mono">{mode === '3d' ? '3D' : '2D'}</span>.
      </p>
    </section>
  );
}
