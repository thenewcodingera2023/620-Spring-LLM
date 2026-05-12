import katex from 'katex';
import { useMemo } from 'react';
import type { Matrix, Vector } from '../../math/types';

export type NumericPreviewValue = number | string | Vector | Matrix;

export interface FormulaPanelProps {
  /** Card title, e.g. "Forward Pass". */
  title?: string;
  /** KaTeX source rendered in display mode. e.g. "z_l = W_l h_{l-1} + b_l". */
  formula?: string;
  /** Short MV-unit tag, e.g. "MV 2.2". Renders as a small badge above the title. */
  mvTag?: string;
  /** Plain-text description shown below the formula. */
  description?: string;
  /**
   * Optional structured numeric values to display alongside the formula.
   * Keys are short symbol labels (e.g. "x", "z_1[0]"); values are scalars, vectors, or matrices.
   * Stage 2 ships this as a static preview block; Stage 3/4 will populate it from store state.
   */
  numericPreview?: Record<string, NumericPreviewValue>;
}

const DEFAULT_TITLE = '';
const DEFAULT_DESCRIPTION = '';

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < 1e-12) return '0';
  return n.toFixed(3).replace(/\.?0+$/, (m) => (m.startsWith('.') ? '' : m));
}

function formatPreview(value: NumericPreviewValue): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return formatNumber(value);
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      const M = value as Matrix;
      return `[${M.map((row) => `[${row.map(formatNumber).join(', ')}]`).join(', ')}]`;
    }
    return `[${(value as Vector).map(formatNumber).join(', ')}]`;
  }
  return '';
}

export function FormulaPanel({
  title = DEFAULT_TITLE,
  formula,
  mvTag,
  description = DEFAULT_DESCRIPTION,
  numericPreview,
}: FormulaPanelProps) {
  const formulaHtml = useMemo(() => {
    if (!formula) return null;
    return katex.renderToString(formula, {
      displayMode: true,
      throwOnError: false,
      output: 'html',
    });
  }, [formula]);

  const previewEntries = numericPreview ? Object.entries(numericPreview) : [];

  const hasAnyContent =
    Boolean(title) ||
    Boolean(formulaHtml) ||
    Boolean(description) ||
    previewEntries.length > 0 ||
    Boolean(mvTag);
  if (!hasAnyContent) {
    return null;
  }

  return (
    <aside aria-label="Formula panel" className="panel p-5 h-full flex flex-col gap-3">
      {title || mvTag ? (
        <div className="flex items-center gap-2">
          {mvTag ? <span className="mv-tag">{mvTag}</span> : null}
          {title ? (
            <h3 className="text-base font-semibold text-ink-strong leading-tight">{title}</h3>
          ) : null}
        </div>
      ) : null}

      {formulaHtml ? (
        <div
          className="formula-display rounded-md border border-paper-rule bg-paper-soft/60 px-4 py-3 overflow-x-auto"
          // KaTeX renders trusted, sanitized HTML for the source we control.
          dangerouslySetInnerHTML={{ __html: formulaHtml }}
        />
      ) : null}

      {description ? (
        <p className="text-sm text-ink-muted leading-relaxed">{description}</p>
      ) : null}

      {previewEntries.length > 0 ? (
        <div className="mt-1 space-y-1">
          <dl className="rounded-md border border-paper-rule divide-y divide-paper-rule overflow-hidden">
            {previewEntries.map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                <dt className="text-[0.75rem] font-mono text-ink-muted">{key}</dt>
                <dd className="text-[0.8rem] font-mono tabular-nums text-ink truncate">
                  {formatPreview(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </aside>
  );
}
