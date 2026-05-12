// Compresses the live token-id array into the 2-D input x via the fixed deterministic encoding.

import katex from 'katex';
import { useMemo } from 'react';
import type { Layer1State } from '../../state/layer1Store';

interface EncodingPanelProps {
  state: Layer1State;
}

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return (value >= 0 ? '+' : '') + value.toFixed(3);
}

function renderInline(source: string): string {
  return katex.renderToString(source, {
    displayMode: false,
    throwOnError: false,
    output: 'html',
  });
}

export function EncodingPanel({ state }: EncodingPanelProps) {
  const { x, meanTokenId, tokens, tokenIdNormalizer } = state;
  const x0Html = useMemo(
    () => renderInline('x_0 = \\dfrac{\\overline{\\mathrm{id}}}{N} \\cdot 2 - 1'),
    [],
  );
  const x1Html = useMemo(
    () => renderInline('x_1 = \\tanh\\!\\left(\\dfrac{|\\text{tokens}| - 5}{5}\\right)'),
    [],
  );

  const meanDisplay = tokens.length > 0 ? meanTokenId.toFixed(2) : '0';

  return (
    <section className="panel p-4 flex flex-col gap-3" aria-label="Encoding to x">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-md border border-paper-rule bg-paper-soft/40 px-3 py-2 flex flex-col gap-1">
          <div className="text-sm" dangerouslySetInnerHTML={{ __html: x0Html }} />
          <div className="font-mono text-[0.75rem] text-ink-muted tabular-nums">
            ({meanDisplay} / {tokenIdNormalizer}) · 2 - 1
          </div>
          <div className="font-mono text-sm text-ink-strong tabular-nums" data-testid="x0-value">
            x[0] = {fmt(x[0])}
          </div>
        </div>
        <div className="rounded-md border border-paper-rule bg-paper-soft/40 px-3 py-2 flex flex-col gap-1">
          <div className="text-sm" dangerouslySetInnerHTML={{ __html: x1Html }} />
          <div className="font-mono text-[0.75rem] text-ink-muted tabular-nums">
            tanh(({tokens.length} - 5) / 5)
          </div>
          <div className="font-mono text-sm text-ink-strong tabular-nums" data-testid="x1-value">
            x[1] = {fmt(x[1])}
          </div>
        </div>
      </div>
    </section>
  );
}
