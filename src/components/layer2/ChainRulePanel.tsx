// Quotient-rule decomposition of grad_q cos(q, d) (Section 3, L2-9). When `liveValues` is
// provided the panel substitutes numerics for q, d, ||q||, ||d||, q·d into every step. The
// final "simplify" line uses the gradient vector from the tested math engine, so the displayed
// numbers and the math engine cannot drift apart.

import katex from 'katex';
import { useMemo } from 'react';
import type { Vector } from '../../math/types';

export interface ChainRuleStep {
  id: string;
  title: string;
  formula: string;
  description?: string;
}

export interface ChainRulePanelLiveValues {
  label: string;
  q: Vector;
  d: Vector;
  qNorm: number;
  dNorm: number;
  qDotD: number;
  cos: number;
  /** Gradient as returned by gradCosWrtQ — the displayed value in the final step. */
  gradient: Vector;
}

interface ChainRulePanelProps {
  steps?: readonly ChainRuleStep[];
  liveValues?: ChainRulePanelLiveValues | null;
}

const DEFAULT_STEPS: readonly ChainRuleStep[] = [
  {
    id: 'definitions',
    title: 'Define numerator and denominator',
    formula: 'g(q) = q \\cdot d, \\quad h(q) = \\lVert q \\rVert \\, \\lVert d \\rVert',
    description: 'Cosine similarity is g(q) divided by h(q).',
  },
  {
    id: 'grad-g',
    title: 'Gradient of the dot product',
    formula: '\\nabla_q g(q) = d',
    description: 'A linear function in q has a constant gradient.',
  },
  {
    id: 'grad-h',
    title: 'Gradient of the denominator',
    formula: '\\nabla_q h(q) = \\dfrac{q}{\\lVert q \\rVert} \\, \\lVert d \\rVert',
    description: 'Chain rule on the norm.',
  },
  {
    id: 'quotient',
    title: 'Apply the quotient rule',
    formula:
      '\\nabla_q \\cos(q, d) = \\dfrac{h(q) \\nabla g(q) - g(q) \\nabla h(q)}{h(q)^2}',
    description: 'Standard MV 2.4 quotient rule.',
  },
  {
    id: 'simplify',
    title: 'Simplify',
    formula:
      '\\nabla_q \\cos(q, d) = \\dfrac{d}{\\lVert q \\rVert \\lVert d \\rVert} - \\dfrac{(q \\cdot d) \\, q}{\\lVert q \\rVert^3 \\lVert d \\rVert}',
    description: 'Algebraically equivalent to (1/||q||) (d-hat - cos q-hat).',
  },
];

function renderFormula(source: string): string {
  return katex.renderToString(source, {
    displayMode: false,
    throwOnError: false,
    output: 'html',
  });
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return 'NaN';
  return (n >= 0 ? '+' : '') + n.toFixed(3);
}

function fmtVec(v: Vector): string {
  return `[${v.map(fmtNum).join(', ')}]`;
}

function substitute(stepId: string, l: ChainRulePanelLiveValues): string {
  switch (stepId) {
    case 'definitions': {
      const h = l.qNorm * l.dNorm;
      return `g(q) = ${fmtNum(l.qDotD)}, h(q) = ${l.qNorm.toFixed(3)} · ${l.dNorm.toFixed(3)} = ${h.toFixed(3)}`;
    }
    case 'grad-g':
      return `∇g = d = ${fmtVec(l.d)}`;
    case 'grad-h': {
      const factor = l.dNorm / l.qNorm;
      const v: Vector = l.q.map((qi) => qi * factor);
      return `∇h = (||d|| / ||q||) · q = ${fmtVec(v)}`;
    }
    case 'quotient': {
      // (h ∇g - g ∇h) / h^2 — generalized to any dimension.
      const h = l.qNorm * l.dNorm;
      const hSq = h * h;
      const factor = (l.qDotD * l.dNorm) / l.qNorm;
      const grad: Vector = l.q.map((qi, i) => (h * l.d[i] - factor * qi) / hSq);
      return `(h · ∇g − g · ∇h) / h² = ${fmtVec(grad)}`;
    }
    case 'simplify':
      return `∇_q cos = ${fmtVec(l.gradient)}`;
    default:
      return '';
  }
}

export function ChainRulePanel({ steps = DEFAULT_STEPS, liveValues }: ChainRulePanelProps) {
  const rendered = useMemo(
    () =>
      steps.map((step) => ({
        ...step,
        html: renderFormula(step.formula),
      })),
    [steps],
  );

  return (
    <section className="panel p-5 flex flex-col gap-3" aria-label="Chain-rule decomposition">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink-strong">
          Chain rule, step by step
        </h3>
        <span className="mv-tag">MV 2.4</span>
      </div>

      {liveValues ? (
        <div
          className="rounded-md border border-paper-rule bg-paper-soft/50 px-3 py-2 font-mono text-xs tabular-nums text-ink"
          aria-label="Chain-rule live values"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">selected</span>
            <span className="font-semibold">{liveValues.label}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">q · d</span>
            <span>{fmtNum(liveValues.qDotD)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">||q|| · ||d||</span>
            <span>
              {liveValues.qNorm.toFixed(3)} · {liveValues.dNorm.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">cos(q, d)</span>
            <span>{fmtNum(liveValues.cos)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">∇_q cos</span>
            <span>{fmtVec(liveValues.gradient)}</span>
          </div>
        </div>
      ) : null}

      <ol className="space-y-3">
        {rendered.map((step, idx) => (
          <li key={step.id} className="border-l-2 border-paper-rule pl-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[0.75rem] font-mono text-ink-subtle tabular-nums">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="text-sm font-medium text-ink">{step.title}</span>
            </div>
            <div
              className="mt-1 text-[0.95rem] formula-display"
              dangerouslySetInnerHTML={{ __html: step.html }}
            />
            {step.description ? (
              <p className="mt-1 text-xs text-ink-muted leading-relaxed">{step.description}</p>
            ) : null}
            {liveValues ? (
              <div className="mt-1 font-mono text-[0.78rem] tabular-nums text-ink leading-snug">
                {substitute(step.id, liveValues)}
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      {!liveValues ? (
        <p className="scaffold-note">
          Select a document to substitute live values for q, d, q · d, ||q||, ||d||, and ∇_q cos.
        </p>
      ) : null}
    </section>
  );
}
