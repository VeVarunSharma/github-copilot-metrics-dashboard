'use client';

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisStyle, ChartTooltip, gridStyle } from './chart-theme';
import { categoricalColor, chartColors } from './palette';

export function StackedBarChart({
  data,
  keys,
  xKey = 'day',
  showAnomalies = false,
  // A single series over a categorical x-axis (e.g. "LoC by feature") colours each
  // bar by its category so it isn't a wall of one hue. Defaults on for single-key
  // data; pass `false` for a single-metric time-series bar chart.
  colorByCategory = keys.length === 1,
}: {
  data: Record<string, unknown>[];
  keys: string[];
  xKey?: string;
  showAnomalies?: boolean;
  colorByCategory?: boolean;
}) {
  const withAnomaly = showAnomalies
    ? data.map((row) => {
        const total = keys.reduce((sum, key) => sum + (typeof row[key] === 'number' ? row[key] as number : 0), 0);
        return { ...row, __anomalyMarker: row.anomaly ? total * 1.06 : null };
      })
    : data;
  // When colouring per category, stash the colour on each row so the tooltip
  // swatch matches the rendered bar.
  const chartData = colorByCategory ? withAnomaly.map((row, i) => ({ ...row, __color: categoricalColor(i) })) : withAnomaly;
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} {...axisStyle} />
          <YAxis {...axisStyle} width={50} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="a" fill={chartColors[i % chartColors.length]} radius={[2, 2, 0, 0]}>
              {colorByCategory ? chartData.map((row, idx) => <Cell key={idx} fill={(row as { __color?: string }).__color ?? categoricalColor(idx)} />) : null}
            </Bar>
          ))}
          {showAnomalies ? (
            <Line type="monotone" dataKey="__anomalyMarker" stroke="transparent" dot={{ r: 3, fill: 'hsl(var(--destructive))' }} activeDot={false} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
