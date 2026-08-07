'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisStyle, ChartTooltip, gridStyle } from './chart-theme';
import { chartColors } from './palette';

export function StackedAreaChart({ data, keys, xKey = 'day' }: { data: Record<string, unknown>[]; keys: string[]; xKey?: string }) {
  return (
    <div className="h-80">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} {...axisStyle} />
          <YAxis {...axisStyle} width={50} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={chartColors[i % chartColors.length]}
              fill={chartColors[i % chartColors.length]}
              fillOpacity={0.45}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
