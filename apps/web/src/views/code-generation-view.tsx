import { Card, CardContent } from '@/components/ui/card';
import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { EmptyState } from '@/components/empty-state';
import { HorizontalBarChart } from '@/components/charts/horizontal-bar';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { StackedAreaChart } from '@/components/charts/stacked-area';
import { StackedBarChart } from '@/components/charts/stacked-bar';
import { TreemapChart } from '@/components/charts/treemap';
import { ViewHeader } from '@/components/layout/view-header';
import { parseDateRange } from '@/lib/date-range';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryCodeGeneration } from '@/server/queries/code-generation';

export async function CodeGenerationView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
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
  const data = await queryCodeGeneration(orgId, range);

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Code Generation"
        subtitle="How much code Copilot generates, where, and by which features."
        range={range}
        orgId={orgId}
      />

      <KpiRow cols={5}>
        <KpiTile label="LoC added" value={data.headlines.locAdded} format="raw" />
        <KpiTile label="LoC deleted" value={data.headlines.locDeleted} format="raw" />
        <KpiTile label="LoC changed" value={data.headlines.locChanged} format="raw" />
        <KpiTile
          label="Acceptance"
          value={data.headlines.acceptanceRate}
          format="percent"
          howCalculated={{ metric: 'acceptance-rate', inputs: data.headlines }}
        />
        <KpiTile label="Agent contribution" value={data.headlines.agentContributionPct} format="percent" />
      </KpiRow>

      <ChartShell title="Daily LoC added vs. deleted" empty={data.dailyLoc.length === 0}>
        <StackedAreaChart
          data={data.dailyLoc}
          keys={['userInitiatedAdded', 'userInitiatedDeleted', 'agentInitiatedAdded', 'agentInitiatedDeleted']}
        />
      </ChartShell>

      <ChartGrid cols={2}>
        <ChartShell title="LoC by language" empty={data.byLanguage.length === 0}>
          <TreemapChart data={data.byLanguage} nameKey="language" valueKey="loc" />
        </ChartShell>
        <ChartShell title="LoC by feature" empty={data.byFeature.length === 0}>
          <StackedBarChart data={data.byFeature} keys={['loc']} xKey="feature" />
        </ChartShell>
        <ChartShell title="LoC by IDE" empty={data.byIde.length === 0}>
          <HorizontalBarChart data={data.byIde} nameKey="ide" valueKey="loc" />
        </ChartShell>
        <ChartShell title="LoC by chat mode" empty={data.byChatMode.length === 0}>
          <HorizontalBarChart data={data.byChatMode} nameKey="mode" valueKey="loc" />
        </ChartShell>
        <ChartShell title="LoC by model" empty={data.byModel.length === 0}>
          <HorizontalBarChart data={data.byModel} nameKey="model" valueKey="loc" />
        </ChartShell>
      </ChartGrid>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-6 text-sm text-muted-foreground">
          LoC is a directional measure of Copilot output, not a measure of value. See the{' '}
          <span className="font-medium">Pull Requests</span> view for delivered-work metrics.
        </CardContent>
      </Card>
    </div>
  );
}
