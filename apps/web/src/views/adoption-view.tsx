import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { EmptyState } from '@/components/empty-state';
import { HorizontalBarChart } from '@/components/charts/horizontal-bar';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { LineChart } from '@/components/charts/line-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar';
import { ViewHeader } from '@/components/layout/view-header';
import { parseDateRange } from '@/lib/date-range';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryAdoption } from '@/server/queries/adoption';

export async function AdoptionView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
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
  const data = await queryAdoption(orgId, range);

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Adoption & Engagement"
        subtitle="Who is using Copilot, how often, and where adoption is stalling."
        range={range}
        orgId={orgId}
      />

      <KpiRow cols={6}>
        <KpiTile label="DAU" value={data.headlines.dau} format="raw" />
        <KpiTile label="WAU" value={data.headlines.wau} format="raw" />
        <KpiTile label="MAU" value={data.headlines.mau} format="raw" />
        <KpiTile label="WAU / seats" value={data.headlines.wauSeatRatio} format="percent" />
        <KpiTile
          label="Acceptance"
          value={data.headlines.acceptanceRate}
          format="percent"
          howCalculated={{ metric: 'acceptance-rate', inputs: data.headlines }}
        />
        <KpiTile label="Agent adoption" value={data.headlines.agentAdoptionPct} format="percent" />
      </KpiRow>

      <ChartShell title="DAU + WAU trend" empty={data.dauWauTrend.length === 0}>
        <LineChart data={data.dauWauTrend} keys={['dau', 'wau']} />
      </ChartShell>

      <ChartGrid cols={2}>
        <ChartShell title="Acceptance rate trend" empty={data.acceptanceRateTrend.length === 0}>
          <LineChart data={data.acceptanceRateTrend} keys={['rate']} />
        </ChartShell>
        <ChartShell title="Chat-mode breakdown" empty={data.chatModeBreakdown.length === 0}>
          <StackedBarChart data={data.chatModeBreakdown} keys={['ask', 'edit', 'plan', 'agent']} />
        </ChartShell>
        <ChartShell title="Most-used IDE" empty={data.topIdes.length === 0}>
          <HorizontalBarChart data={data.topIdes} nameKey="ide" valueKey="count" />
        </ChartShell>
        <ChartShell title="Most-used model" empty={data.topModels.length === 0}>
          <HorizontalBarChart data={data.topModels} nameKey="model" valueKey="count" />
        </ChartShell>
      </ChartGrid>

      <Card>
        <CardHeader>
          <CardTitle>Adoption funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiRow cols={4}>
            {data.funnel.map((stage) => (
              <KpiTile key={stage.stage} label={stage.stage} value={stage.count} format="raw" />
            ))}
          </KpiRow>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-6 text-sm text-muted-foreground">
          WAU/seats below 60% suggests an enablement opportunity. Agent adoption below 20% usually means users need a demo to progress past completions.
        </CardContent>
      </Card>
    </div>
  );
}
