import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartGrid } from '@/components/chart-grid';
import { ChartShell } from '@/components/chart-shell';
import { EmptyState } from '@/components/empty-state';
import { HorizontalBarChart } from '@/components/charts/horizontal-bar';
import { HowCalculatedPanel } from '@/components/how-calculated-panel';
import { KpiRow } from '@/components/kpi-row';
import { KpiTile } from '@/components/kpi-tile';
import { LineChart } from '@/components/charts/line-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar';
import { ViewHeader } from '@/components/layout/view-header';
import { formatCurrency, formatPercent } from '@/lib/format';
import { parseDateRange } from '@/lib/date-range';
import { resolveOrgId } from '@/lib/resolve-org';
import { queryConsumptionPatterns } from '@/server/queries/consumption';

export async function ConsumptionView({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
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

  const data = await queryConsumptionPatterns(orgId, range);
  const metricInput = (value: number | null) => value ?? 'suppressed/unavailable';
  const headlineInputs = {
    activeUsers: data.headlines.activeUsers,
    top20InteractionShare: metricInput(data.headlines.top20InteractionShare),
    top10InteractionShare: metricInput(data.headlines.top10InteractionShare),
    topTeamInteractionShare: metricInput(data.headlines.topTeamInteractionShare),
    premiumModelSpendShare: metricInput(data.headlines.premiumModelSpendShare),
    costConsciousShare: metricInput(data.headlines.costConsciousShare),
    billingAvailable: data.headlines.billingAvailable ? 'yes' : 'no',
    currency: data.headlines.currency,
  };
  const billingUnavailableMessage = 'Run the collector with AI-credit billing scope to populate model spend and cost-conscious metrics.';

  return (
    <div className="space-y-8">
      <ViewHeader
        title="Consumption Patterns"
        subtitle="Understand power-user cohorts, team/group demand, model spend, and cost-center opportunities."
        range={range}
        orgId={orgId}
      />

      <KpiRow cols={6}>
        <KpiTile label="Active users" value={data.headlines.activeUsers} format="raw" />
        <KpiTile
          label="Top 20% share"
          value={data.headlines.top20InteractionShare}
          format="percent"
          hint={data.headlines.top20InteractionShare == null ? 'Hidden until the cohort contains at least 5 users.' : undefined}
          howCalculated={{ metric: 'consumption-top20', inputs: headlineInputs }}
        />
        <KpiTile
          label="Top 10% share"
          value={data.headlines.top10InteractionShare}
          format="percent"
          hint={data.headlines.top10InteractionShare == null ? 'Hidden until the cohort contains at least 5 users.' : undefined}
          howCalculated={{ metric: 'consumption-top10', inputs: headlineInputs }}
        />
        <KpiTile
          label="Top team share"
          value={data.headlines.topTeamInteractionShare}
          format="percent"
          howCalculated={{ metric: 'consumption-top-team', inputs: headlineInputs }}
        />
        <KpiTile
          label="Premium model share"
          value={data.headlines.premiumModelSpendShare}
          format="percent"
          hint={!data.headlines.billingAvailable ? 'AI-credit billing data is not available.' : undefined}
          howCalculated={{ metric: 'premium-model-spend-share', inputs: headlineInputs }}
        />
        <KpiTile
          label="Included credit share"
          value={data.headlines.costConsciousShare}
          format="percent"
          hint={!data.headlines.billingAvailable ? 'AI-credit billing data is not available.' : undefined}
          howCalculated={{ metric: 'cost-conscious-share', inputs: headlineInputs }}
        />
      </KpiRow>

      <ChartGrid cols={2}>
        <ChartShell title="Consumption concentration" empty={data.concentration.length === 0}>
          <LineChart data={data.concentration} keys={['cumulativeInteractions', 'cumulativeLoc']} xKey="percentile" />
        </ChartShell>
        <ChartShell title="Cohort drivers" empty={data.cohorts.length === 0}>
          <StackedBarChart data={data.cohorts} keys={['interactionShare', 'locShare', 'chatShare', 'agentShare', 'cliShare']} xKey="cohort" />
        </ChartShell>
      </ChartGrid>

      <ChartGrid cols={2}>
        <ChartShell title="Team/group consumption" empty={data.teams.length === 0}>
          <HorizontalBarChart data={data.teams} nameKey="teamSlug" valueKey="interactions" />
        </ChartShell>
        <ChartShell
          title="Model billed spend"
          empty={data.modelSpend.length === 0}
          emptyTitle={data.headlines.billingAvailable ? 'No model spend for this range' : 'AI-credit billing not ingested'}
          emptyDescription={data.headlines.billingAvailable ? 'Try a wider date range or run the collector for more days.' : billingUnavailableMessage}
        >
          <HorizontalBarChart data={data.modelSpend} nameKey="model" valueKey="billedAmount" />
        </ChartShell>
        <ChartShell
          title="Cost-conscious teams"
          empty={data.costConscious.length === 0}
          emptyTitle={data.headlines.billingAvailable ? 'No cost-conscious team signal' : 'AI-credit billing not ingested'}
          emptyDescription={data.headlines.billingAvailable ? 'This chart needs AI-credit billing, user model facts, and team membership above the privacy threshold.' : billingUnavailableMessage}
        >
          <HorizontalBarChart data={data.costConscious} nameKey="segment" valueKey="score" />
        </ChartShell>
        <Card className="border-dashed bg-muted/30">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Interpretation</CardTitle>
              <HowCalculatedPanel metric="cost-conscious-score" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Power-user cohorts show where consumption concentrates without creating a public per-developer leaderboard.
              Team rows below the privacy threshold are suppressed.
            </p>
            <p>
              Cost-conscious score compares team consumption with estimated billed model overage when AI-credit billing is ingested.
              Users in multiple teams contribute to each joined team, so team shares are attribution signals rather than a strict 100% allocation.
            </p>
          </CardContent>
        </Card>
      </ChartGrid>

      <Card>
        <CardHeader>
          <CardTitle>Cost-center suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.suggestions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.suggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{suggestion.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{suggestion.rationale}</p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground">
                      {suggestion.confidence}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    Suggested cost center: <span className="font-mono">{suggestion.suggestedCostCenter}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No strong cost-center suggestions for this range. Broaden the date range, ingest team membership data, or enable AI-credit billing for model-spend suggestions.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Model spend totals are org-level billing facts. Team model-efficiency signals use normalized user-level model
          breakdowns with an org-wide fallback when billing and usage model names differ. Current billed model spend:{' '}
          {data.headlines.billingAvailable ? formatCurrency(data.modelSpend.reduce((sum, row) => sum + row.billedAmount, 0), data.headlines.currency) : 'unavailable'}.
          Top 20% cohort share: {data.headlines.top20InteractionShare == null ? 'suppressed/unavailable' : formatPercent(data.headlines.top20InteractionShare)}.
        </CardContent>
      </Card>
    </div>
  );
}
