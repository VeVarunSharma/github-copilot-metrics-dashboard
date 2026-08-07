import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { ComboBarLineChart } from '@/components/charts/combo-bar-line';
import { EmptyState } from '@/components/empty-state';
import { HowCalculatedPanel } from '@/components/how-calculated-panel';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { StackedAreaChart } from '@/components/charts/stacked-area';
import { ViewHeader } from '@/components/layout/view-header';
import { parseDateRange } from '@/lib/date-range';
import { formatCurrency, formatHours, formatPercent } from '@/lib/format';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryEngineeringHealth } from '@/server/queries/engineering-health';
import { queryDelivery } from '@/server/queries/delivery';
import { queryOverview } from '@/server/queries/overview';
import { queryUnitEconomics } from '@/server/queries/unit-economics';
import type { UnitEconomicMetric } from '@ghcp-dash/contracts';

const overviewUnitMetricKeys = ['dollar-per-merged-pr', 'dollar-per-active-user', 'dollar-per-1k-loc', 'dollar-per-copilot-pr'] as const;
type OverviewUnitMetricKey = typeof overviewUnitMetricKeys[number];
type OverviewUnitMetricPanelId = 'unit-cost-per-pr' | 'cost-per-active-user' | 'unit-cost-per-kloc' | 'unit-cost-per-copilot-pr';

const overviewUnitMetricPanelId: Record<OverviewUnitMetricKey, OverviewUnitMetricPanelId> = {
  'dollar-per-merged-pr': 'unit-cost-per-pr',
  'dollar-per-active-user': 'cost-per-active-user',
  'dollar-per-1k-loc': 'unit-cost-per-kloc',
  'dollar-per-copilot-pr': 'unit-cost-per-copilot-pr',
};

function unitInputs(m: UnitEconomicMetric) {
  return { numerator: m.numerator, denominator: m.denominator, from: m.dateRange.from, to: m.dateRange.to };
}

function BridgeItem({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'muted' | 'accent' | 'positive' | 'negative' }) {
  const valueClass =
    tone === 'accent'
      ? 'text-primary'
      : tone === 'positive'
      ? 'text-success'
      : tone === 'negative'
      ? 'text-destructive'
      : tone === 'muted'
      ? 'text-muted-foreground'
      : 'text-foreground';
  return (
    <div className="flex-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
    </div>
  );
}

function BridgeArrow() {
  return <div className="hidden items-center text-lg text-muted-foreground/50 sm:flex" aria-hidden>→</div>;
}

export async function OverviewView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
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
  const [data, delivery, engineeringHealth, unitEconomics] = await Promise.all([
    queryOverview(orgId, range),
    queryDelivery(orgId, range),
    queryEngineeringHealth(orgId, range),
    queryUnitEconomics(orgId, range),
  ]);
  const wow = data.weekOverWeekDeltas ?? { activeUsersDelta: 0, acceptanceRateDelta: 0, dollarsSavedDelta: 0, prsByCopilotDelta: 0 };
  const trend = (delta: number) => ({ delta, direction: delta >= 0 ? 'up' as const : 'down' as const });
  const h = data.headlines;
  const c = h.currency;
  const headlineInputs = { hoursSavedMtd: h.hoursSavedMtd, dollarsSavedMtd: h.dollarsSavedMtd, roiRatio: h.roiRatio, netValue: h.netValue, totalSpendMtd: h.totalSpendMtd };
  const costHref = `/cost?orgId=${encodeURIComponent(orgId)}&from=${range.from}&to=${range.to}`;
  const blendEntries = (Object.entries(h.basis.blend) as [string, number][]).filter(([, w]) => w > 0).map(([k]) => k);
  const unitMetric = (key: OverviewUnitMetricKey) => unitEconomics.metrics.find((m) => m.metricKey === key);

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Overview"
        subtitle="Executive value summary."
        range={range}
        orgId={orgId}
      />

      <section className="space-y-3" aria-labelledby="overview-headline">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Core value story</p>
          <h2 id="overview-headline" className="text-xl font-semibold tracking-tight">What Copilot saved, and whether it paid back</h2>
        </div>
        <KpiRow cols={3}>
          <KpiTile
            label="$ saved this month"
            value={h.dollarsSavedMtd}
            format="dollars"
            currency={c}
            howCalculated={{ metric: 'dollars-saved-mtd', inputs: headlineInputs }}
          />
          <KpiTile
            label="Hours saved this month"
            value={h.hoursSavedMtd}
            format="hours"
            howCalculated={{ metric: 'hours-saved-mtd', inputs: headlineInputs }}
          />
          <KpiTile
            label="ROI"
            value={h.roiRatio}
            format="percent"
            hint={`Net ${formatCurrency(h.netValue, c)}`}
            howCalculated={{ metric: 'roi', inputs: headlineInputs }}
          />
        </KpiRow>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <span>
            Methodology basis: <span className="font-semibold text-foreground">{h.basis.label}</span>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/settings" className="font-medium text-link underline-offset-4 hover:underline">change in Settings</Link>
          <span className="text-muted-foreground/40">·</span>
          <span>Conservative by design — we lead with the most defensible of three estimators.</span>
          <HowCalculatedPanel metric="value-basis" inputs={{ activity: h.basis.blend.activity, output: h.basis.blend.output, delivery: h.basis.blend.delivery }} />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="overview-value-bridge">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle id="overview-value-bridge">Spend-to-value bridge</CardTitle>
            <Link href={costHref} className="text-xs font-medium text-link underline-offset-4 hover:underline">See cost breakdown →</Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <BridgeItem label="You paid" value={formatCurrency(h.totalSpendMtd, c)} tone="muted" />
              <BridgeArrow />
              <BridgeItem label={`Copilot saved (${h.basis.label})`} value={formatCurrency(h.dollarsSavedMtd, c)} tone="accent" />
              <BridgeArrow />
              <BridgeItem label="Net value" value={formatCurrency(h.netValue, c)} tone={h.netValue >= 0 ? 'positive' : 'negative'} />
              <BridgeArrow />
              <BridgeItem label="ROI" value={formatPercent(h.roiRatio)} />
            </div>
            <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
              Net value = dollars saved (blended) − total spend (seats + premium + AI credits). Negative ROI is shown explicitly.
              <HowCalculatedPanel metric="net-value" inputs={{ dollarsSaved: h.dollarsSavedMtd, totalSpend: h.totalSpendMtd, netValue: h.netValue }} />
            </p>
          </CardContent>
        </Card>

        <ChartShell
          title="Spend vs. value over time"
          description="Seat, premium, and AI-credit spend plotted against blended dollars saved before the supporting evidence."
          empty={data.spendVsValue.length === 0}
        >
          <ComboBarLineChart
            data={data.spendVsValue}
            bars={['seatCost', 'premiumSpend', 'aiCreditSpend']}
            line="dollarsSavedBlended"
          />
        </ChartShell>
      </section>

      <section className="space-y-3" aria-labelledby="overview-unit-economics">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="overview-unit-economics" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Unit economics</h2>
            <p className="text-xs text-muted-foreground">
              What the selected-period spend buys. Unavailable denominators render as <span className="font-medium text-foreground">—</span>, never $0.
            </p>
          </div>
          <Link href={costHref} className="text-xs font-medium text-link underline-offset-4 hover:underline">See full Cost & Spend →</Link>
        </div>
        <KpiRow cols={4}>
          {overviewUnitMetricKeys.map((key) => {
            const m = unitMetric(key);
            if (!m) return null;
            return (
              <KpiTile
                key={key}
                label={m.label}
                value={m.value}
                format="dollars"
                currency={c}
                howCalculated={{ metric: overviewUnitMetricPanelId[key], inputs: unitInputs(m) }}
              />
            );
          })}
        </KpiRow>
      </section>

      <section className="space-y-6" aria-labelledby="overview-supporting-evidence">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supporting evidence</p>
          <h2 id="overview-supporting-evidence" className="text-xl font-semibold tracking-tight">Adoption, PRs, delivery, and methodology detail</h2>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Adoption & PR evidence</h3>
          <KpiRow cols={3}>
            <KpiTile label="Active users" value={data.sub.activeUsers} format="raw" />
            <KpiTile
              label="Acceptance rate"
              value={data.sub.acceptanceRate}
              format="percent"
              howCalculated={{ metric: 'acceptance-rate', inputs: { acceptanceRate: data.sub.acceptanceRate } }}
            />
            <KpiTile label="PRs by Copilot" value={data.sub.prsByCopilot} format="raw" copilot />
          </KpiRow>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Delivery & Quality</h3>
          <KpiRow cols={4}>
            <KpiTile
              label="Deploy frequency"
              value={delivery.headlines.deploymentFrequency}
              format="raw"
              hint="deploys/day"
              howCalculated={{ metric: 'deployment-frequency', inputs: { value: delivery.headlines.deploymentFrequency ?? 'insufficient-data' } }}
            />
            <KpiTile
              label="Lead time"
              value={delivery.headlines.leadTimeMin}
              format="raw"
              hint="minutes"
              howCalculated={{ metric: 'lead-time', inputs: { minutes: delivery.headlines.leadTimeMin ?? 'insufficient-data' } }}
            />
            <KpiTile
              label="CI success"
              value={engineeringHealth.headlines.ciSuccessRate}
              format="percent"
              howCalculated={{ metric: 'ci-success-rate', inputs: { value: engineeringHealth.headlines.ciSuccessRate ?? 'insufficient-data' } }}
            />
            <KpiTile
              label="MTTR"
              value={delivery.headlines.mttrMin}
              format="raw"
              hint="minutes"
              howCalculated={{ metric: 'mttr', inputs: { minutes: delivery.headlines.mttrMin ?? 'insufficient-data' } }}
            />
          </KpiRow>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Week-over-week signals</h3>
          <KpiRow cols={4}>
            <KpiTile
              label="Active users Δ"
              value={wow.activeUsersDelta}
              format="percent"
              hint="vs prior 7d"
              trend={trend(wow.activeUsersDelta)}
              howCalculated={{ metric: 'active-users-wow-delta', inputs: wow }}
            />
            <KpiTile
              label="Acceptance rate Δ"
              value={wow.acceptanceRateDelta}
              format="percent"
              hint="vs prior 7d"
              trend={trend(wow.acceptanceRateDelta)}
              howCalculated={{ metric: 'acceptance-rate-wow-delta', inputs: wow }}
            />
            <KpiTile
              label="$ saved Δ"
              value={wow.dollarsSavedDelta}
              format="dollars"
              currency={c}
              hint="vs prior 7d"
              trend={trend(wow.dollarsSavedDelta)}
              howCalculated={{ metric: 'dollars-saved-wow-delta', inputs: wow }}
            />
            <KpiTile
              label="PRs by Copilot Δ"
              value={wow.prsByCopilotDelta}
              format="raw"
              hint="vs prior 7d"
              trend={trend(wow.prsByCopilotDelta)}
              howCalculated={{ metric: 'prs-by-copilot-wow-delta', inputs: wow }}
            />
          </KpiRow>
        </div>

        <ChartGrid cols={2}>
          <ChartShell title="Dollars saved per day" empty={data.dailySaved.length === 0}>
            <StackedAreaChart data={data.dailySaved} keys={['activity', 'output', 'delivery']} />
          </ChartShell>

          <Card>
            <CardHeader>
              <CardTitle>Estimator comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-muted-foreground">
                We compute time saved three ways and show all three. The headline uses{' '}
                <span className="font-medium text-foreground">{h.basis.label}</span>.{' '}
                <span className="font-medium text-foreground">Delivery</span> is the most conservative — tied to merged and
                reviewed PRs. <span className="font-medium text-foreground">Output</span> (LoC) is directional only.{' '}
                <span className="font-medium text-foreground">Activity</span> counts raw interactions.
              </p>
              <div className="space-y-3">
                {data.estimatorBreakdown.map((row) => {
                  const active = blendEntries.includes(row.estimator);
                  return (
                    <div
                      key={row.estimator}
                      className={`flex items-center justify-between rounded-md border-b px-2 py-2 last:border-0 ${active ? 'bg-primary/5' : ''}`}
                    >
                      <span className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
                        {row.estimator}
                        {active ? <span className="rounded bg-[hsl(var(--primary)/0.12)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary-hover">headline</span> : null}
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {formatHours(row.hoursSaved)}
                        <span className="mx-2 text-muted-foreground/40">·</span>
                        {formatCurrency(row.dollarsSaved, c)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </ChartGrid>
      </section>
    </div>
  );
}
