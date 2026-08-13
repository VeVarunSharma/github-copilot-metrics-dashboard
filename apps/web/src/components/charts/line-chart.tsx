'use client';

import { CartesianGrid, Line, LineChart as RLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisStyle, ChartTooltip, gridStyle } from './chart-theme';
import { chartColors } from './palette';

export function LineChart({ data, keys, xKey = 'day' }: { data: Record<string, unknown>[]; keys: string[]; xKey?: string }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <RLineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} {...axisStyle} />
          <YAxis {...axisStyle} width={50} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={chartColors[i % chartColors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
