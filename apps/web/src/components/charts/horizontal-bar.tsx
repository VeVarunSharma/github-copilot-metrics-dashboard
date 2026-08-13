'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisStyle, ChartTooltip } from './chart-theme';
import { categoricalColor } from './palette';

export function HorizontalBarChart({ data, nameKey, valueKey }: { data: Record<string, unknown>[]; nameKey: string; valueKey: string }) {
  // Stash the per-category colour on each row so the tooltip swatch matches the bar.
  const rows = data.map((r, i) => ({ ...r, __color: categoricalColor(i) }));
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <XAxis type="number" {...axisStyle} />
          <YAxis dataKey={nameKey} type="category" width={100} {...axisStyle} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
          <Bar dataKey={valueKey} radius={[0, 4, 4, 0]}>
            {rows.map((row, i) => (
              <Cell key={i} fill={row.__color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
