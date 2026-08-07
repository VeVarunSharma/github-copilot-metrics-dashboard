import type { ReactNode } from 'react';

interface ViewHeaderProps {
  title: string;
  subtitle?: ReactNode;
  range?: { from: string; to: string };
  orgId?: string | null;
  actions?: ReactNode;
}

export function ViewHeader({ title, subtitle, range, orgId, actions }: ViewHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
        {(range || orgId) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {range ? (
              <span>
                <span className="hidden sm:inline">Range </span>
                <span className="font-mono">{range.from} → {range.to}</span>
              </span>
            ) : null}
            {orgId ? (
              <>
                {range ? <span aria-hidden>·</span> : null}
                <span>
                  Org <span className="font-mono">{orgId}</span>
                </span>
              </>
            ) : null}
          </div>
        )}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
