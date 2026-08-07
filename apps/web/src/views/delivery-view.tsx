import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { EmptyState } from '@/components/empty-state';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { DoraTrendChart, LeadTimeAreaChart, ReleasesBarChart } from '@/components/charts/evil/delivery-quality-charts';
import { ViewHeader } from '@/components/layout/view-header';
import { parseDateRange } from '@/lib/date-range';
import { formatNumber } from '@/lib/format';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryDelivery } from '@/server/queries/delivery';

function minutesHint(value: number | null) {
  return value == null ? 'Insufficient sample' : `${formatNumber(value / 60)}h`;
}

export async function DeliveryView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
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

  const data = await queryDelivery(orgId, range);

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Delivery Velocity"
        subtitle="Advanced preview — DORA delivery context with maturing denominator definitions: shipping cadence, lead time, failure rate, and recovery time."
        range={range}
        orgId={orgId}
      />

      <KpiRow cols={5}>
        <KpiTile label="Deploy frequency" value={data.headlines.deploymentFrequency} format="raw" hint="deploys/day" howCalculated={{ metric: 'deployment-frequency', inputs: { value: data.headlines.deploymentFrequency ?? 'insufficient-data' } }} />
        <KpiTile label="Lead time" value={data.headlines.leadTimeMin} format="raw" hint={minutesHint(data.headlines.leadTimeMin)} howCalculated={{ metric: 'lead-time', inputs: { minutes: data.headlines.leadTimeMin ?? 'insufficient-data' } }} />
        <KpiTile label="Change failure rate" value={data.headlines.changeFailureRate} format="percent" howCalculated={{ metric: 'change-failure-rate', inputs: { value: data.headlines.changeFailureRate ?? 'insufficient-data' } }} />
        <KpiTile label="MTTR" value={data.headlines.mttrMin} format="raw" hint={minutesHint(data.headlines.mttrMin)} howCalculated={{ metric: 'mttr', inputs: { minutes: data.headlines.mttrMin ?? 'insufficient-data' } }} />
        <KpiTile label="Commits/day" value={data.headlines.commitsPerDay} format="raw" howCalculated={{ metric: 'commits-per-day', inputs: { commitsPerDay: data.headlines.commitsPerDay } }} />
      </KpiRow>

      <ChartShell title="DORA trend" empty={data.trend.length === 0}>
        <DoraTrendChart data={data.trend} />
      </ChartShell>

      <ChartGrid cols={2}>
        <ChartShell title="Releases per day" empty={data.releases.length === 0}>
          <ReleasesBarChart data={data.releases} />
        </ChartShell>
        <ChartShell title="Lead-time distribution" empty={data.leadTimeDistribution.length === 0}>
          <LeadTimeAreaChart data={data.leadTimeDistribution} />
        </ChartShell>
      </ChartGrid>

      <Card>
        <CardHeader>
          <CardTitle>Repository drilldown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.perRepo.length === 0 ? (
            <EmptyState title="No repository data" description="Release aggregates will appear here after delivery data is ingested." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 font-medium">Repository</th>
                    <th className="py-2 text-right font-medium">Deploys/day</th>
                    <th className="py-2 text-right font-medium">Lead time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perRepo.map((repo) => (
                    <tr key={repo.repoId} className="border-b last:border-0">
                      <td className="py-2">{repo.repoName}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(repo.deploymentFrequency ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums">{repo.leadTimeMin == null ? '—' : `${formatNumber(repo.leadTimeMin / 60)}h`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
