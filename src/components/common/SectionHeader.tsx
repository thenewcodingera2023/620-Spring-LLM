import type { ReactNode } from 'react';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, trailing }: SectionHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="panel-heading">{eyebrow}</div> : null}
        <h2 className="text-lg font-semibold text-ink-strong leading-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-ink-muted leading-relaxed max-w-prose">{description}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
