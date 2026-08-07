import Link from 'next/link';
import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { ComboBarLineChart } from '@/components/charts/combo-bar-line';
import { DonutChart } from '@/components/charts/donut';
import { EmptyState } from '@/components/empty-state';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { LineChart } from '@/components/charts/line-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar';
import { ViewHeader } from '@/components/layout/view-header';
import { parseDateRange } from '@/lib/date-range';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryCost } from '@/server/queries/cost';
import { queryUnitEconomics } from '@/server/queries/unit-economics';
import type { UnitEconomicMetric } from '@ghcp-dash/contracts';

type UnitMetricId = 'unit-cost-per-pr' | 'cost-per-active-user' | 'unit-cost-per-kloc' | 'unit-cost-per-copilot-pr' | 'dollar-per-active-user-trend';

const metricPanelId: Record<string, UnitMetricId> = {
  'dollar-per-merged-pr': 'unit-cost-per-pr',
  'dollar-per-active-user': 'cost-per-active-user',
  'dollar-per-1k-loc': 'unit-cost-per-kloc',
  'dollar-per-copilot-pr': 'unit-cost-per-copilot-pr',
  'dollar-per-active-user-trend': 'dollar-per-active-user-trend',
};

function unitInputs(m: UnitEconomicMetric) {
  return { numerator: m.numerator, denominator: m.denominator, from: m.dateRange.from, to: m.dateRange.to };
}

export async function CostView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const range = parseDateRange(searchParams);
  const orgId = await resolveOrgId(searchParams?.orgId);
  if (!orgId) {
    return (
      <EmptyState
        title="No orgs ingested yet"
        description="Run `pnpm db:seed:demo` to populate synthetic data, or set GITHUB_TOKEN + GITHUB_ORGS and run `pnpm collect`."
      />
    );
  }
  const [data, unitEconomics] = await Promise.all([queryCost(orgId, range), queryUnitEconomics(orgId, range)]);
  const c = data.headlines.currency;
  const overviewHref = `/overview?orgId=${encodeURIComponent(orgId)}&from=${range.from}&to=${range.to}`;

  const metric = (key: string) => unitEconomics.metrics.find((m) => m.metricKey === key);
  const trend = metric('dollar-per-active-user-trend');
  const overTime = unitEconomics.overTime.map((r) => ({
    day: r.day,
    '$ / merged PR': r.dollarPerMergedPr,
    '$ / active user': r.dollarPerActiveUser,
    '$ / 1k LoC': r.dollarPer1kLoc,
    '$ / Copilot PR': r.dollarPerCopilotPr,
  }));
  const overTimeKeys = ['$ / merged PR', '$ / active user', '$ / 1k LoC', '$ / Copilot PR'];
  const overTimeEmpty = unitEconomics.overTime.every(
    (r) => r.dollarPerMergedPr == null && r.dollarPerActiveUser == null && r.dollarPer1kLoc == null && r.dollarPerCopilotPr == null,
  );

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Cost & Spend"
        subtitle="What you are actually paying — seats, premium requests, AI credits."
        range={range}
        orgId={orgId}
      />

      <KpiRow cols={4}>
        <KpiTile label="Total spend" value={data.headlines.totalSpendMtd} format="dollars" currency={c} />
        <KpiTile label="Seat cost" value={data.headlines.seatCostMtd} format="dollars" currency={c} />
        <KpiTile label="Premium spend" value={data.headlines.premiumSpendMtd} format="dollars" currency={c} />
        <KpiTile label="AI-credit spend" value={data.headlines.aiCreditSpendMtd} format="dollars" currency={c} />
      </KpiRow>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Unit economics</h2>
          <Link href={overviewHref} className="text-xs font-medium text-link underline-offset-4 hover:underline">
            See the full value story →
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          What each shipped thing costs. Tiles show <span className="font-medium text-foreground">—</span> when there is nothing
          to divide by (e.g. no Copilot-authored PRs), never a misleading $0.
        </p>
        <KpiRow cols={5}>
          {(['dollar-per-merged-pr', 'dollar-per-active-user', 'dollar-per-1k-loc', 'dollar-per-copilot-pr'] as const).map((key) => {
            const m = metric(key);
            if (!m) return null;
            return (
              <KpiTile
                key={key}
                label={m.label}
                value={m.value}
                format="dollars"
                currency={c}
                howCalculated={{ metric: metricPanelId[key], inputs: unitInputs(m) }}
              />
            );
          })}
          {trend ? (
            <KpiTile
              label={trend.label}
              value={trend.value}
              format="dollars"
              currency={c}
              hint="per active user / day"
              sparkline={trend.series.map((s) => s.value)}
              howCalculated={{ metric: 'dollar-per-active-user-trend', inputs: unitInputs(trend) }}
            />
          ) : null}
        </KpiRow>
      </div>

      <ChartShell title="Daily spend" empty={data.dailyStacked.length === 0}>
        <StackedBarChart data={data.dailyStacked} keys={['seat', 'premium', 'aiCredits']} showAnomalies />
      </ChartShell>

      <ChartGrid cols={2}>
        <ChartShell title="Spend by model" empty={data.byModel.length === 0}>
          <DonutChart data={data.byModel} nameKey="model" valueKey="amount" />
        </ChartShell>
        <ChartShell title="Cost per chat request" empty={data.costPerChatRequest.length === 0}>
          <LineChart data={data.costPerChatRequest} keys={['costPerRequest']} />
        </ChartShell>
        <ChartShell title="Burndown vs. included pool" empty={data.includedBurndown.length === 0}>
          <ComboBarLineChart data={data.includedBurndown} bars={['included']} line="billed" />
        </ChartShell>
        <ChartShell title="Forecast end-of-month spend" empty={data.forecast.length === 0}>
          <LineChart data={data.forecast} keys={['projected']} />
        </ChartShell>
      </ChartGrid>

      <ChartShell title="Unit economics over time" empty={overTimeEmpty}>
        <LineChart data={overTime} keys={overTimeKeys} />
      </ChartShell>
    </div>
  );
}
