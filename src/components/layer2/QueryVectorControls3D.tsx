// Stage 6 — 3D query vector controls.
//
// Three sliders (x, y, z) bound to state.query3D. Each onChange builds a length-3 vector and
// calls setQuery3D, which runs the same magnitude clamp [0.1, 3.0] used by 2D drag. Below the
// sliders we surface ||q|| live and a note that the clamp applies.

import { norm } from '../../math/linalg';
import type { Layer2State } from '../../state/layer2Store';

interface QueryVectorControls3DProps {
  state: Layer2State;
}

const SLIDER_MIN = -3;
const SLIDER_MAX = 3;
const SLIDER_STEP = 0.05;
const AXIS_LABELS = ['x_1', 'x_2', 'x_3'] as const;

export function QueryVectorControls3D({ state }: QueryVectorControls3DProps) {
  const q = state.query3D;
  const mag = norm(q);

  function setComponent(i: number, value: number) {
    const next = q.slice();
    next[i] = value;
    state.setQuery3D(next);
  }

  return (
    <section
      className="panel p-4 flex flex-col gap-3"
      aria-label="3D query vector controls"
    >
      <div className="flex items-center justify-between">
        <h3 className="panel-heading">Query · 3D controls</h3>
        <span className="text-[0.7rem] font-mono text-ink-subtle">
          ||q|| = {mag.toFixed(3)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {AXIS_LABELS.map((axis, i) => (
          <div key={axis} className="flex items-center gap-3">
            <label
              htmlFor={`q3d-${axis}`}
              className="w-10 text-[0.75rem] font-mono text-ink-muted"
            >
              {axis}
            </label>
            <input
              id={`q3d-${axis}`}
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={q[i]}
              onChange={(e) => setComponent(i, Number(e.target.value))}
              aria-label={`Query component ${axis}`}
              className="flex-1 accent-accent-forward"
            />
            <span className="w-14 text-right font-mono text-xs tabular-nums text-ink">
              {q[i] >= 0 ? '+' : ''}
              {q[i].toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[0.7rem] text-ink-subtle leading-relaxed">
        Magnitude clamped to [{state.clamp.min}, {state.clamp.max}]. Driving all three components
        to zero falls back to the previous direction.
      </p>
    </section>
  );
}
