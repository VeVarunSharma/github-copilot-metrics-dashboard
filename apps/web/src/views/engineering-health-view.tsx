import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { EmptyState } from '@/components/empty-state';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { CiSuccessLineChart, FailureBreakdownBarChart, FlakyTestsPieChart } from '@/components/charts/evil/delivery-quality-charts';
import { ViewHeader } from '@/components/layout/view-header';
import { parseDateRange } from '@/lib/date-range';
import { formatNumber } from '@/lib/format';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryEngineeringHealth } from '@/server/queries/engineering-health';

function secondsHint(value: number | null) {
  return value == null ? 'Insufficient sample' : `${formatNumber(value / 60)}m`;
}

export async function EngineeringHealthView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
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

  const data = await queryEngineeringHealth(orgId, range);

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Engineering Health"
        subtitle="Advanced preview — CI reliability, time-to-green, rework placeholders, and re-run proxy signals while source maturity improves."
        range={range}
        orgId={orgId}
      />

      <KpiRow cols={5}>
        <KpiTile label="CI success" value={data.headlines.ciSuccessRate} format="percent" howCalculated={{ metric: 'ci-success-rate', inputs: { value: data.headlines.ciSuccessRate ?? 'insufficient-data' } }} />
        <KpiTile label="Time-to-green" value={data.headlines.medianTimeToGreenSec} format="raw" hint={secondsHint(data.headlines.medianTimeToGreenSec)} howCalculated={{ metric: 'time-to-green', inputs: { seconds: data.headlines.medianTimeToGreenSec ?? 'insufficient-data' } }} />
        <KpiTile label="PR rework" value={data.headlines.prReworkRate} format="raw" hint="Phase 2" howCalculated={{ metric: 'pr-rework-rate', inputs: { value: data.headlines.prReworkRate ?? 'not-ingested' } }} />
        <KpiTile label="Dependabot open" value={data.headlines.dependabotOpen} format="raw" hint="Phase 2" howCalculated={{ metric: 'dependabot-open', inputs: { value: data.headlines.dependabotOpen ?? 'not-ingested' } }} />
        <KpiTile label="Test stability" value={data.headlines.testStability} format="percent" hint="re-run proxy" howCalculated={{ metric: 'test-stability', inputs: { value: data.headlines.testStability ?? 'insufficient-data' } }} />
      </KpiRow>

      <ChartShell title="CI success-rate trend" empty={data.ciSuccessTrend.length === 0}>
        <CiSuccessLineChart data={data.ciSuccessTrend} />
      </ChartShell>

      <ChartGrid cols={2}>
        <ChartShell title="Failure breakdown" empty={data.failureBreakdown.length === 0}>
          <FailureBreakdownBarChart data={data.failureBreakdown} />
        </ChartShell>
        <ChartShell title="Top flaky tests / re-run proxy" empty={data.flakyTests.length === 0}>
          <FlakyTestsPieChart data={data.flakyTests} />
        </ChartShell>
      </ChartGrid>
    </div>
  );
}
