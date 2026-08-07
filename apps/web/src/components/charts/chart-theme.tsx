'use client';

import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

/**
 * Shared theme-aware Recharts primitives. All charts in `src/components/charts/`
 * use these so they pick up dark/light mode automatically via CSS variables.
 */

export const axisStyle = {
  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
  stroke: 'hsl(var(--border))',
  tickLine: false,
  axisLine: false,
} as const;

export const gridStyle = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '3 3',
  vertical: false,
} as const;

export function ChartTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-tooltip px-3 py-2 text-tooltip-foreground shadow-xl">
      {label !== undefined ? <div className="mb-1 text-xs font-medium text-[hsl(var(--tooltip-foreground)/0.72)]">{label}</div> : null}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? ''}-${i}`} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block size-2 rounded-sm"
              style={{ backgroundColor: (entry.payload as { __color?: string } | undefined)?.__color ?? entry.color ?? 'hsl(var(--chart-1))' }}
            />
            <span className="text-[hsl(var(--tooltip-foreground)/0.72)]">{entry.name ?? entry.dataKey}</span>
            <span className="ml-auto font-medium tabular-nums">{formatTooltipValue(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTooltipValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return String(value);
}
