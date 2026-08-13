'use client';

import { ResponsiveContainer, Treemap as RTreemap, Tooltip } from 'recharts';
import { ChartTooltip } from './chart-theme';
import { categoricalColor } from './palette';

type TreemapNodeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  depth?: number;
};

/** Custom Treemap node: colours each leaf by its index so the chart shows the
 *  full categorical palette instead of a single flat fill. */
function TreemapNode({ x = 0, y = 0, width = 0, height = 0, index = 0, name = '', depth = 0 }: TreemapNodeProps) {
  if (depth === 0) return <g />; // skip the invisible root rectangle
  const showLabel = width > 56 && height > 24;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        fill={categoricalColor(index)}
        stroke="hsl(var(--card))"
        strokeWidth={2}
      />
      {showLabel ? (
        <text
          x={x + 6}
          y={y + 16}
          fontSize={11}
          fontWeight={600}
          fill="#fff"
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 2.5 }}
        >
          {name}
        </text>
      ) : null}
    </g>
  );
}

export function TreemapChart({ data, nameKey, valueKey }: { data: Record<string, unknown>[]; nameKey: string; valueKey: string }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <RTreemap data={data} dataKey={valueKey} nameKey={nameKey} content={<TreemapNode />}>
          <Tooltip content={<ChartTooltip />} />
        </RTreemap>
      </ResponsiveContainer>
    </div>
  );
}
