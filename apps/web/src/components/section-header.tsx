import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
}

export function SectionHeader({ title, hint, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3 pb-2">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
