import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { EmptyState } from '@/components/empty-state';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { LineChart } from '@/components/charts/line-chart';
import { StackedAreaChart } from '@/components/charts/stacked-area';
import { StackedBarChart } from '@/components/charts/stacked-bar';
import { ViewHeader } from '@/components/layout/view-header';
import { parseDateRange } from '@/lib/date-range';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryPullRequests } from '@/server/queries/pull-requests';

export async function PullRequestsView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
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
  const data = await queryPullRequests(orgId, range);
  const suggestions = [{ stage: 'total', ...data.suggestions }];
  const prior = data.priorPeriodHeadlines ?? { totalCreated: 0, pctByCopilot: 0, totalMerged: 0, pctMergedByCopilot: 0, pctReviewedByCopilot: 0 };
  const trend = (delta: number) => ({ delta, direction: delta >= 0 ? 'up' as const : 'down' as const });

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Pull Requests"
        subtitle="How much of your shipped work is Copilot-touched, and is it landing faster."
        range={range}
        orgId={orgId}
      />

      <KpiRow cols={5}>
        <KpiTile label="PRs created" value={data.headlines.totalCreated} format="raw" trend={trend(data.headlines.totalCreated - prior.totalCreated)} />
        <KpiTile label="% by Copilot" value={data.headlines.pctByCopilot} format="percent" trend={trend(data.headlines.pctByCopilot - prior.pctByCopilot)} />
        <KpiTile label="PRs merged" value={data.headlines.totalMerged} format="raw" trend={trend(data.headlines.totalMerged - prior.totalMerged)} />
        <KpiTile
          label="% merged by Copilot"
          value={data.headlines.pctMergedByCopilot}
          format="percent"
          trend={trend(data.headlines.pctMergedByCopilot - prior.pctMergedByCopilot)}
          howCalculated={{ metric: 'delivery-hours', inputs: data.headlines }}
        />
        <KpiTile label="% reviewed by Copilot" value={data.headlines.pctReviewedByCopilot} format="percent" trend={trend(data.headlines.pctReviewedByCopilot - prior.pctReviewedByCopilot)} />
      </KpiRow>

      <ChartShell title="PRs merged per day" empty={data.dailyMerged.length === 0}>
        <StackedAreaChart data={data.dailyMerged} keys={['copilotAuthored', 'copilotReviewed', 'neither']} />
      </ChartShell>

      <ChartGrid cols={2}>
        <ChartShell title="Median time to merge" empty={data.timeToMerge.length === 0}>
          <LineChart data={data.timeToMerge} keys={['allMedian', 'copilotAuthoredMedian']} />
        </ChartShell>
        <ChartShell title="Suggestions" empty={data.suggestions.totalSuggestions === 0}>
          <StackedBarChart
            data={suggestions}
            xKey="stage"
            keys={['totalSuggestions', 'copilotSuggestions', 'appliedSuggestions', 'copilotAppliedSuggestions']}
          />
        </ChartShell>
      </ChartGrid>

      <Card>
        <CardHeader>
          <CardTitle>Authored vs. reviewed overlap</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiRow cols={3}>
            <KpiTile label="Authored only" value={data.authoredVsReviewedOverlap.authoredOnly} format="raw" />
            <KpiTile label="Reviewed only" value={data.authoredVsReviewedOverlap.reviewedOnly} format="raw" />
            <KpiTile label="Both" value={data.authoredVsReviewedOverlap.both} format="raw" />
          </KpiRow>
        </CardContent>
      </Card>
    </div>
  );
}
