// Step 10: shows what the network weights would look like after one gradient-descent step on
// this single (x, y) example. Marks dead-ReLU-related W_1 rows as "no update" since their
// gradient is exactly 0. The actual sampleSpec is never mutated.

import type { Layer1State } from '../../state/layer1Store';

interface WeightUpdatePanelProps {
  state: Layer1State;
}

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return (value >= 0 ? '+' : '') + value.toFixed(3);
}

export function WeightUpdatePanel({ state }: WeightUpdatePanelProps) {
  if (!state.visibility.update) {
    return null;
  }

  const { spec, updatedSpec, sigmaPrime, eta } = state;
  const W1Before = spec.layers[0].W;
  const W1After = updatedSpec.layers[0].W;
  const W2Before = spec.layers[1].W;
  const W2After = updatedSpec.layers[1].W;
  const reluGate = sigmaPrime[0];

  return (
    <section className="panel p-4 flex flex-col gap-3" aria-label="Gradient descent update">
      <div className="font-mono text-[0.75rem] leading-snug text-ink-muted">
        eta = {eta.toFixed(2)}
      </div>

      <div>
        <div className="text-[0.7rem] uppercase tracking-wide text-ink-subtle font-mono mb-1">
          W_1
        </div>
        <ul className="space-y-1 font-mono text-[0.78rem] tabular-nums">
          {W1Before.map((row, i) => {
            const dead = reluGate[i] === 0;
            return (
              <li
                key={`w1-${i}`}
                className={`rounded-md border px-2.5 py-1.5 ${
                  dead ? 'border-paper-rule bg-paper-soft/60' : 'border-accent-forward/30 bg-paper-panel'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-muted">row {i}</span>
                  {dead ? (
                    <span className="text-[0.65rem] uppercase tracking-wide text-accent-backward">
                      no update · dead node
                    </span>
                  ) : null}
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-subtle text-[0.7rem]">before</span>
                  <span>[{row.map(fmt).join(', ')}]</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-subtle text-[0.7rem]">after</span>
                  <span className={dead ? 'text-ink-muted' : 'text-ink-strong'}>
                    [{W1After[i].map(fmt).join(', ')}]
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className="text-[0.7rem] uppercase tracking-wide text-ink-subtle font-mono mb-1">
          W_2
        </div>
        <ul className="space-y-1 font-mono text-[0.78rem] tabular-nums">
          {W2Before.map((row, i) => (
            <li
              key={`w2-${i}`}
              className="rounded-md border border-accent-forward/30 bg-paper-panel px-2.5 py-1.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-subtle text-[0.7rem]">row {i} before</span>
                <span>[{row.map(fmt).join(', ')}]</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-subtle text-[0.7rem]">row {i} after</span>
                <span className="text-ink-strong">[{W2After[i].map(fmt).join(', ')}]</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
