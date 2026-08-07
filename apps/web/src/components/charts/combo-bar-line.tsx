'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisStyle, ChartTooltip, gridStyle } from './chart-theme';
import { chartColors } from './palette';

export function ComboBarLineChart({ data, bars, line, xKey = 'day' }: { data: Record<string, unknown>[]; bars: string[]; line: string; xKey?: string }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} {...axisStyle} />
          <YAxis {...axisStyle} width={50} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
          {bars.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="a" fill={chartColors[i % chartColors.length]} radius={[2, 2, 0, 0]} />
          ))}
          <Line type="monotone" dataKey={line} stroke={chartColors[bars.length % chartColors.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
