import type { ReactNode } from 'react';

type Tone = 'neutral' | 'forward' | 'backward' | 'gradient';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  caption?: string;
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-paper-soft border-paper-rule text-ink',
  forward: 'bg-accent-forward-soft border-accent-forward/30 text-accent-forward',
  backward: 'bg-accent-backward-soft border-accent-backward/30 text-accent-backward',
  gradient: 'bg-accent-gradient-soft border-accent-gradient/30 text-accent-gradient',
};

export function MetricCard({ label, value, caption, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className={`rounded-md border px-3 py-2 ${toneStyles[tone]}`}>
      <div className="text-[0.7rem] uppercase tracking-wide opacity-80 font-mono">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums leading-tight">{value}</div>
      {caption ? <div className="mt-0.5 text-[0.7rem] opacity-70">{caption}</div> : null}
    </div>
  );
}
