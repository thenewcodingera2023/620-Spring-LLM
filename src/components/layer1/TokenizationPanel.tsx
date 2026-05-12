// Tokenizer output for the live text: id list, count, mean id.

import type { Layer1State } from '../../state/layer1Store';

interface TokenizationPanelProps {
  state: Layer1State;
}

function formatTokens(ids: readonly number[]): string {
  if (ids.length === 0) return '[]';
  const max = 64;
  if (ids.length <= max) return `[${ids.join(', ')}]`;
  return `[${ids.slice(0, max).join(', ')}, ... (+${ids.length - max} more)]`;
}

export function TokenizationPanel({ state }: TokenizationPanelProps) {
  const { tokens, meanTokenId } = state;
  const meanDisplay = tokens.length > 0 ? meanTokenId.toFixed(2) : '—';

  return (
    <section className="panel p-4 flex flex-col gap-2" aria-label="Tokenization">
      <div className="rounded-md border border-paper-rule bg-paper-soft/50 px-3 py-2 font-mono text-[0.78rem] leading-relaxed text-ink-strong break-words">
        <div data-testid="token-ids">{formatTokens(tokens)}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-paper-rule bg-paper-panel px-3 py-2 font-mono text-sm tabular-nums">
          <div className="text-[0.65rem] uppercase tracking-wide text-ink-subtle">count</div>
          <div data-testid="token-count" className="text-ink-strong">{tokens.length}</div>
        </div>
        <div className="rounded-md border border-paper-rule bg-paper-panel px-3 py-2 font-mono text-sm tabular-nums">
          <div className="text-[0.65rem] uppercase tracking-wide text-ink-subtle">mean</div>
          <div data-testid="mean-token-id" className="text-ink-strong">{meanDisplay}</div>
        </div>
      </div>
    </section>
  );
}
