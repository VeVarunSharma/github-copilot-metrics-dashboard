'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './chart-theme';
import { chartColors } from './palette';

export function DonutChart({ data, nameKey, valueKey }: { data: Record<string, unknown>[]; nameKey: string; valueKey: string }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} nameKey={nameKey} dataKey={valueKey} innerRadius={60} outerRadius={100} strokeWidth={2} stroke="hsl(var(--card))">
            {data.map((_, i) => (
              <Cell key={i} fill={chartColors[i % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
