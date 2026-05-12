// Ranked list of documents. The component is presentational: it takes pre-ordered rows with
// cosine values from useLayer2State and renders them. It does NOT compute ranking or cosine
// similarity — those come from the tested math engine in src/math/cosine.ts.

export interface LeaderboardRow {
  index: number;
  label: string;
  /** Cosine value to display. Null renders as an em-dash (no cosine available yet). */
  cosine: number | null;
  /** Optional secondary line, e.g. angle to query in degrees. */
  caption?: string;
}

interface LeaderboardProps {
  rows: readonly LeaderboardRow[];
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  /** Title rendered above the list. */
  title?: string;
}

function fmtCosine(c: number | null): string {
  if (c === null || !Number.isFinite(c)) return '—';
  return c.toFixed(3);
}

export function Leaderboard({
  rows,
  selectedIndex = null,
  onSelect,
  title = 'Ranking',
}: LeaderboardProps) {
  return (
    <section className="panel p-4 flex flex-col gap-2" aria-label="Document ranking">
      <div className="flex items-baseline justify-between">
        <h3 className="panel-heading">{title}</h3>
      </div>

      <ol className="flex flex-col" role="list">
        {rows.map((row, position) => {
          const selected = selectedIndex === row.index;
          const interactive = Boolean(onSelect);
          return (
            <li key={row.index}>
              <button
                type="button"
                disabled={!interactive}
                aria-pressed={selected}
                onClick={interactive ? () => onSelect?.(row.index) : undefined}
                className={[
                  'w-full flex items-center justify-between gap-3 px-2 py-2 rounded-md text-left',
                  'border border-transparent transition-colors',
                  interactive ? 'hover:bg-paper-soft' : 'cursor-default',
                  selected ? 'border-accent-gradient/40 bg-accent-gradient-soft' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-[0.75rem] font-mono text-ink-subtle tabular-nums">
                    {position + 1}.
                  </span>
                  <span className="font-mono text-sm text-ink truncate">{row.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm tabular-nums text-ink">
                    {fmtCosine(row.cosine)}
                  </div>
                  {row.caption ? (
                    <div className="text-[0.7rem] text-ink-subtle">{row.caption}</div>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
