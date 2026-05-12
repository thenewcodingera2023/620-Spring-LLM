import { Suspense, lazy } from 'react';
import { MetricCard } from '../components/common/MetricCard';
import { SectionHeader } from '../components/common/SectionHeader';
import { EmbeddingPlane2D } from '../components/layer2/EmbeddingPlane2D';
import { Leaderboard, type LeaderboardRow } from '../components/layer2/Leaderboard';
import { ModeToggle } from '../components/layer2/ModeToggle';
import { QueryPresetPanel } from '../components/layer2/QueryPresetPanel';
import { QueryVectorControls3D } from '../components/layer2/QueryVectorControls3D';
import { norm } from '../math/linalg';
import { useLayer2State } from '../state/layer2Store';

const EmbeddingSpace3D = lazy(() =>
  import('../components/layer2/EmbeddingSpace3D').then((m) => ({ default: m.EmbeddingSpace3D })),
);

export function LayerTwoPage() {
  const state = useLayer2State();
  const is3D = state.mode === '3d';

  const rows: LeaderboardRow[] = state.ranking.map((idx) => ({
    index: idx,
    label: state.documentLabels[idx],
    cosine: state.cosines[idx],
    caption: `θ ≈ ${((state.angles[idx] * 180) / Math.PI).toFixed(0)}°`,
  }));

  const queryMag = norm(state.activeQuery);
  const selectedAngleDeg =
    state.selectedAngleRad !== null ? (state.selectedAngleRad * 180) / Math.PI : null;

  const planeCaption = is3D
    ? `Adjust x_1 / x_2 / x_3 sliders below. Magnitude is clamped to [${state.clamp.min}, ${state.clamp.max}].`
    : `Drag the blue handle at the tip of q. Magnitude is clamped to [${state.clamp.min}, ${state.clamp.max}]. Documents are fixed.`;

  return (
    <section
      id="panel-layer-two"
      role="tabpanel"
      aria-labelledby="tab-layer-two"
      className="grid gap-6 lg:grid-cols-3"
    >
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="panel p-6 flex flex-col gap-4">
          <SectionHeader
            eyebrow="Layer 2"
            title="Finding the Document"
            description="A reader types a query; the engine ranks four news articles by how closely each one matches. Drag the blue query arrow (or pick a preset) and watch the ranking re-sort."
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ModeToggle mode={state.mode} onChange={state.setMode} />
            <span className="text-[0.7rem] font-mono text-ink-subtle">
              dim = <span className="text-ink">{state.activeDimension}D</span>
            </span>
          </div>

          {is3D ? (
            <Suspense
              fallback={
                <div
                  className="w-full bg-paper-panel rounded-md border border-paper-rule flex items-center justify-center text-sm text-ink-muted"
                  style={{ height: 440 }}
                >
                  Loading 3D scene…
                </div>
              }
            >
              <EmbeddingSpace3D state={state} caption={planeCaption} />
            </Suspense>
          ) : (
            <EmbeddingPlane2D state={state} caption={planeCaption} />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={state.resetQuery}
              className="text-xs font-mono text-ink-muted hover:text-ink underline-offset-2 hover:underline"
            >
              Reset query · clear selection
            </button>
            {state.selectedIndex !== null ? (
              <button
                type="button"
                onClick={() => state.selectDocument(null)}
                className="text-xs font-mono text-ink-muted hover:text-ink underline-offset-2 hover:underline"
              >
                Clear document selection
              </button>
            ) : null}
          </div>
        </div>

        <QueryPresetPanel state={state} />

        {is3D ? <QueryVectorControls3D state={state} /> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="||q||"
            value={queryMag.toFixed(3)}
            caption={`clamp [${state.clamp.min}, ${state.clamp.max}]`}
          />
          <MetricCard
            label={`cos(q, ${state.selectedLabel ?? 'article'})`}
            value={state.selectedCosine !== null ? state.selectedCosine.toFixed(3) : '—'}
            caption={state.selectedIndex === null ? 'Select an article' : 'Live'}
            tone="gradient"
          />
          <MetricCard
            label="θ (deg)"
            value={selectedAngleDeg !== null ? selectedAngleDeg.toFixed(1) : '—'}
            caption={
              state.selectedIndex === null
                ? 'Angle to selected article'
                : 'Angle between q and the selected article'
            }
            tone="forward"
          />
        </div>

      </div>

      <div className="flex flex-col gap-6">
        <Leaderboard
          rows={rows}
          selectedIndex={state.selectedIndex}
          onSelect={state.selectDocument}
        />
      </div>
    </section>
  );
}
