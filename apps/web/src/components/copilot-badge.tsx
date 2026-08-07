import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The signature Copilot marker (DESIGN.md §Components). Uses the reserved
 * Copilot Purple (`--chart-copilot-1`) at a subtle tint so it reads as
 * "Copilot-attributed" without competing with the GitHub Green hero.
 * Apply to any KPI, series legend, or module driven by Copilot-attributed data
 * (Constitution Principle 9 — make attribution visible).
 */
export function CopilotBadge({ label = 'Copilot', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        'bg-[hsl(var(--chart-copilot-1)/0.12)] text-[hsl(var(--chart-copilot-1))]',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
