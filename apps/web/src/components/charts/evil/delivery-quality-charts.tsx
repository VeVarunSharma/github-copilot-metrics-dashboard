'use client';

import { EvilAreaChart } from '@/components/charts/evil/charts/area-chart';
import { EvilBarChart } from '@/components/charts/evil/charts/bar-chart';
import { EvilLineChart } from '@/components/charts/evil/charts/line-chart';
import { EvilPieChart } from '@/components/charts/evil/charts/pie-chart';
import type { ChartConfig } from '@/components/charts/evil/ui/chart';
import { ChartLegendContent } from '@/components/charts/evil/ui/legend';
import { ChartTooltipContent } from '@/components/charts/evil/ui/tooltip';
import { Area, Bar, CartesianGrid, Cell, Legend, Line, Pie, Tooltip, XAxis, YAxis } from 'recharts';
import { categoricalColor } from '@/components/charts/palette';

// General delivery/engineering-health accents. These metrics are org-wide and
// NOT Copilot-attributed, so they avoid the reserved Copilot tokens
// (--chart-copilot-*). They use general categorical-ramp hues (blue/teal) — the
// ramp is general-purpose, not the --security-blue semantic token (see
// /DESIGN.md §Data Visualization → "Ramp vs. reservations").
const chartColors = {
  accentA: 'hsl(var(--chart-3))',
  accentB: 'hsl(var(--chart-5))',
  baseline: 'hsl(var(--chart-baseline))',
  neutral: 'hsl(var(--chart-neutral))',
};

const axisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

function compactNumber(value: unknown) {
  return typeof value === 'number' ? Intl.NumberFormat('en-US', { notation: 'compact' }).format(value) : String(value);
}

function percentTick(value: unknown) {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : String(value);
}

function dayTick(value: unknown) {
  return String(value).slice(5).replace('-', '/');
}

const doraConfig = {
  deploymentFrequency: { label: 'Deploys/day', colors: { light: [chartColors.accentA], dark: [chartColors.accentA] } },
  leadTimeHours: { label: 'Lead time (h)', colors: { light: [chartColors.accentB], dark: [chartColors.accentB] } },
  changeFailureRatePct: { label: 'CFR (%)', colors: { light: ['hsl(var(--chart-9))'], dark: ['hsl(var(--chart-9))'] } },
  mttrHours: { label: 'MTTR (h)', colors: { light: ['hsl(var(--chart-6))'], dark: ['hsl(var(--chart-6))'] } },
} satisfies ChartConfig;

type DoraTrendPoint = {
  day: string;
  deploymentFrequency: number | null;
  leadTimeMin: number | null;
  changeFailureRate: number | null;
  mttrMin: number | null;
};

export function DoraTrendChart({ data }: { data: DoraTrendPoint[] }) {
  const chartData = data.map((row) => ({
    day: row.day,
    deploymentFrequency: row.deploymentFrequency,
    leadTimeHours: row.leadTimeMin == null ? null : row.leadTimeMin / 60,
    changeFailureRatePct: row.changeFailureRate == null ? null : row.changeFailureRate * 100,
    mttrHours: row.mttrMin == null ? null : row.mttrMin / 60,
  }));

  return (
    <div className="h-[360px]">
      <EvilLineChart config={doraConfig} data={chartData} className="h-full" curveType="monotone" animationType="center-out">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickFormatter={dayTick} {...axisProps} />
        <YAxis tickFormatter={compactNumber} width={48} {...axisProps} />
        <Tooltip content={<ChartTooltipContent />} />
        <Legend content={<ChartLegendContent />} />
        <Line dataKey="deploymentFrequency" type="monotone" stroke="var(--color-deploymentFrequency-0)" strokeWidth={2} dot={false} connectNulls isAnimationActive />
        <Line dataKey="leadTimeHours" type="monotone" stroke="var(--color-leadTimeHours-0)" strokeWidth={2} dot={false} connectNulls isAnimationActive />
        <Line dataKey="changeFailureRatePct" type="monotone" stroke="var(--color-changeFailureRatePct-0)" strokeWidth={2} dot={false} connectNulls isAnimationActive />
        <Line dataKey="mttrHours" type="monotone" stroke="var(--color-mttrHours-0)" strokeWidth={2} dot={false} connectNulls isAnimationActive />
      </EvilLineChart>
    </div>
  );
}

const releasesConfig = {
  count: { label: 'Releases', colors: { light: [chartColors.accentA], dark: [chartColors.accentA] } },
} satisfies ChartConfig;

export function ReleasesBarChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <div className="h-[320px]">
      <EvilBarChart config={releasesConfig} data={data} className="h-full" animationType="left-to-right" barCategoryGap={12}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickFormatter={dayTick} {...axisProps} />
        <YAxis tickFormatter={compactNumber} width={48} {...axisProps} />
        <Tooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count-0)" radius={[4, 4, 0, 0]} isAnimationActive />
      </EvilBarChart>
    </div>
  );
}

const leadTimeConfig = {
  p50Hours: { label: 'p50 lead time (h)', colors: { light: [chartColors.accentA], dark: [chartColors.accentA] } },
  p90Hours: { label: 'p90 lead time (h)', colors: { light: [chartColors.accentB], dark: [chartColors.accentB] } },
} satisfies ChartConfig;

export function LeadTimeAreaChart({ data }: { data: { day: string; p50: number | null; p90: number | null }[] }) {
  const chartData = data.map((row) => ({
    day: row.day,
    p50Hours: row.p50 == null ? null : row.p50 / 60,
    p90Hours: row.p90 == null ? null : row.p90 / 60,
  }));

  return (
    <div className="h-[320px]">
      <EvilAreaChart config={leadTimeConfig} data={chartData} className="h-full" curveType="monotone" animationType="left-to-right">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickFormatter={dayTick} {...axisProps} />
        <YAxis tickFormatter={compactNumber} width={48} {...axisProps} />
        <Tooltip content={<ChartTooltipContent />} />
        <Legend content={<ChartLegendContent />} />
        <Area dataKey="p50Hours" type="monotone" stroke="var(--color-p50Hours-0)" fill="var(--color-p50Hours-0)" fillOpacity={0.24} strokeWidth={2} connectNulls isAnimationActive />
        <Area dataKey="p90Hours" type="monotone" stroke="var(--color-p90Hours-0)" fill="var(--color-p90Hours-0)" fillOpacity={0.16} strokeWidth={2} connectNulls isAnimationActive />
      </EvilAreaChart>
    </div>
  );
}

const ciConfig = {
  rate: { label: 'CI success', colors: { light: [chartColors.accentA], dark: [chartColors.accentA] } },
} satisfies ChartConfig;

export function CiSuccessLineChart({ data }: { data: { day: string; rate: number | null }[] }) {
  return (
    <div className="h-[360px]">
      <EvilLineChart config={ciConfig} data={data} className="h-full" curveType="monotone" animationType="center-out">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickFormatter={dayTick} {...axisProps} />
        <YAxis tickFormatter={percentTick} width={48} domain={[0, 1]} {...axisProps} />
        <Tooltip content={<ChartTooltipContent />} />
        <Line dataKey="rate" type="monotone" stroke="var(--color-rate-0)" strokeWidth={2} dot={false} connectNulls isAnimationActive />
      </EvilLineChart>
    </div>
  );
}

const failureConfig = {
  failureCount: { label: 'Failures', colors: { light: [chartColors.baseline], dark: [chartColors.baseline] } },
} satisfies ChartConfig;

export function FailureBreakdownBarChart({ data }: { data: { workflowName: string; failureCount: number }[] }) {
  return (
    <div className="h-[320px]">
      <EvilBarChart config={failureConfig} data={data} className="h-full" layout="horizontal" animationType="left-to-right" barCategoryGap={10}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={compactNumber} {...axisProps} />
        <YAxis type="category" dataKey="workflowName" width={96} tickLine={false} axisLine={false} tickMargin={8} />
        <Tooltip content={<ChartTooltipContent />} />
        <Bar dataKey="failureCount" radius={[0, 4, 4, 0]} isAnimationActive>
          {data.map((entry, index) => (
            <Cell key={entry.workflowName} fill={categoricalColor(index)} />
          ))}
        </Bar>
      </EvilBarChart>
    </div>
  );
}

const flakyConfig = {
  rate: { label: 'Failure/re-run proxy', colors: { light: [chartColors.accentA], dark: [chartColors.accentA] } },
} satisfies ChartConfig;

export function FlakyTestsPieChart({ data }: { data: { workflowName: string; rate: number }[] }) {
  return (
    <div className="h-[320px]">
      <EvilPieChart config={flakyConfig} data={data} dataKey="rate" nameKey="workflowName" className="h-full">
        <Tooltip content={<ChartTooltipContent nameKey="workflowName" hideLabel />} />
        <Legend content={<ChartLegendContent nameKey="workflowName" />} />
        <Pie data={data} dataKey="rate" nameKey="workflowName" innerRadius="52%" outerRadius="78%" cornerRadius={8} paddingAngle={2} isAnimationActive>
          {data.map((entry, index) => (
            <Cell key={entry.workflowName} fill={categoricalColor(index)} />
          ))}
        </Pie>
      </EvilPieChart>
    </div>
  );
}
