'use client';

import { EvilAreaChart } from '@/components/charts/evil/charts/area-chart';
import { EvilBarChart } from '@/components/charts/evil/charts/bar-chart';
import { EvilLineChart } from '@/components/charts/evil/charts/line-chart';
import { EvilPieChart } from '@/components/charts/evil/charts/pie-chart';
import type { ChartConfig } from '@/components/charts/evil/ui/chart';
import { ChartLegendContent } from '@/components/charts/evil/ui/legend';
import { ChartTooltipContent } from '@/components/charts/evil/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Area as RechartsArea,
  Bar as RechartsBar,
  CartesianGrid,
  Cell,
  Legend as RechartsLegend,
  Line as RechartsLine,
  Pie as RechartsPie,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DailyMetric = {
  day: string;
  copilot: number;
  accepted: number;
  baseline: number;
  neutral: number;
};

const chartColors = {
  copilot: 'hsl(var(--chart-copilot-1))',
  accepted: 'hsl(var(--chart-copilot-2))',
  baseline: 'hsl(var(--chart-baseline))',
  neutral: 'hsl(var(--chart-neutral))',
};

const dualSeriesConfig = {
  copilot: { label: 'Copilot suggestions', colors: { light: [chartColors.copilot], dark: [chartColors.copilot] } },
  accepted: { label: 'Accepted suggestions', colors: { light: [chartColors.accepted], dark: [chartColors.accepted] } },
} satisfies ChartConfig;

const comparisonConfig = {
  copilot: { label: 'Copilot', colors: { light: [chartColors.copilot], dark: [chartColors.copilot] } },
  baseline: { label: 'Baseline', colors: { light: [chartColors.baseline], dark: [chartColors.baseline] } },
} satisfies ChartConfig;

const barConfig = {
  copilot: { label: 'Generated lines', colors: { light: [chartColors.copilot], dark: [chartColors.copilot] } },
  accepted: { label: 'Accepted lines', colors: { light: [chartColors.accepted], dark: [chartColors.accepted] } },
  baseline: { label: 'Manual baseline', colors: { light: [chartColors.baseline], dark: [chartColors.baseline] } },
} satisfies ChartConfig;

const pieConfig = {
  suggestions: { label: 'Suggestions', colors: { light: [chartColors.copilot], dark: [chartColors.copilot] } },
  completions: { label: 'Completions', colors: { light: [chartColors.accepted], dark: [chartColors.accepted] } },
  reviews: { label: 'Reviews', colors: { light: [chartColors.baseline], dark: [chartColors.baseline] } },
  chat: { label: 'Chat', colors: { light: [chartColors.neutral], dark: [chartColors.neutral] } },
} satisfies ChartConfig;

const dailyData: DailyMetric[] = Array.from({ length: 28 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 4, 24 + index));
  const weekdayLift = [0, 6].includes(date.getUTCDay()) ? -22 : 0;
  const trend = Math.round(index * 1.8);
  const wave = Math.round(Math.sin(index / 2.8) * 12);
  const copilot = 118 + trend + wave + weekdayLift;
  const accepted = Math.round(copilot * (0.58 + ((index % 5) * 0.018)));

  return {
    day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    copilot,
    accepted,
    baseline: 86 + Math.round(index * 0.9) + Math.round(Math.cos(index / 3) * 8) + Math.round(weekdayLift / 2),
    neutral: 42 + Math.round(index * 0.4) + Math.round(Math.sin(index / 4) * 5),
  };
});

const pieData = [
  { category: 'suggestions', value: dailyData.reduce((sum, day) => sum + day.copilot, 0) },
  { category: 'completions', value: dailyData.reduce((sum, day) => sum + day.accepted, 0) },
  { category: 'reviews', value: 840 },
  { category: 'chat', value: 620 },
];

function compactNumber(value: unknown) {
  return typeof value === 'number' ? Intl.NumberFormat('en-US', { notation: 'compact' }).format(value) : String(value);
}

function dayTick(value: unknown) {
  return String(value).replace(' ', '\u00a0');
}

const axisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

export function EvilChartsSmokeTestClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">EvilCharts smoke test</h1>
        <p className="text-sm text-muted-foreground">Hidden verification page for light and dark mode rendering.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Area chart</CardTitle>
            <CardDescription>28-day suggestion and acceptance trend.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <EvilAreaChart config={dualSeriesConfig} data={dailyData} className="h-full" curveType="monotone" animationType="left-to-right">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={dayTick} {...axisProps} />
              <YAxis tickFormatter={compactNumber} width={48} {...axisProps} />
              <RechartsTooltip content={<ChartTooltipContent />} />
              <RechartsLegend content={<ChartLegendContent />} />
              <RechartsArea dataKey="copilot" type="monotone" stroke="var(--color-copilot-0)" fill="var(--color-copilot-0)" fillOpacity={0.24} strokeWidth={2} isAnimationActive />
              <RechartsArea dataKey="accepted" type="monotone" stroke="var(--color-accepted-0)" fill="var(--color-accepted-0)" fillOpacity={0.18} strokeWidth={2} isAnimationActive />
            </EvilAreaChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line chart</CardTitle>
            <CardDescription>Copilot activity compared with baseline output.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <EvilLineChart config={comparisonConfig} data={dailyData} className="h-full" curveType="monotone" animationType="center-out">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={dayTick} {...axisProps} />
              <YAxis tickFormatter={compactNumber} width={48} {...axisProps} />
              <RechartsTooltip content={<ChartTooltipContent />} />
              <RechartsLegend content={<ChartLegendContent />} />
              <RechartsLine dataKey="copilot" type="monotone" stroke="var(--color-copilot-0)" strokeWidth={2} dot={false} isAnimationActive />
              <RechartsLine dataKey="baseline" type="monotone" stroke="var(--color-baseline-0)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive />
            </EvilLineChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bar chart</CardTitle>
            <CardDescription>Daily generated, accepted, and baseline lines.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <EvilBarChart config={barConfig} data={dailyData} className="h-full" animationType="left-to-right" barCategoryGap={18}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={dayTick} {...axisProps} />
              <YAxis tickFormatter={compactNumber} width={48} {...axisProps} />
              <RechartsTooltip content={<ChartTooltipContent />} />
              <RechartsLegend content={<ChartLegendContent />} />
              <RechartsBar dataKey="copilot" fill="var(--color-copilot-0)" radius={[4, 4, 0, 0]} isAnimationActive />
              <RechartsBar dataKey="accepted" fill="var(--color-accepted-0)" radius={[4, 4, 0, 0]} isAnimationActive />
              <RechartsBar dataKey="baseline" fill="var(--color-baseline-0)" radius={[4, 4, 0, 0]} isAnimationActive />
            </EvilBarChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pie chart</CardTitle>
            <CardDescription>Aggregate Copilot-related activity mix.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <EvilPieChart config={pieConfig} data={pieData} dataKey="value" nameKey="category" className="h-full">
              <RechartsTooltip content={<ChartTooltipContent nameKey="category" hideLabel />} />
              <RechartsLegend content={<ChartLegendContent nameKey="category" />} />
              <RechartsPie data={pieData} dataKey="value" nameKey="category" innerRadius="52%" outerRadius="78%" cornerRadius={8} paddingAngle={2} isAnimationActive>
                {pieData.map((entry) => (
                  <Cell key={entry.category} fill={`var(--color-${entry.category}-0)`} />
                ))}
              </RechartsPie>
            </EvilPieChart>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
