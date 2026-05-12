import type { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  hint?: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  children?: ReactNode;
}

export function Tabs({ tabs, activeId, onChange, children }: TabsProps) {
  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Visualization layers"
        className="flex flex-wrap gap-1 border-b border-paper-rule"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                  ? 'border-ink-strong text-ink-strong'
                  : 'border-transparent text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              <span>{tab.label}</span>
              {tab.hint ? (
                <span className="ml-2 text-[0.7rem] uppercase tracking-wide text-ink-subtle font-mono">
                  {tab.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
