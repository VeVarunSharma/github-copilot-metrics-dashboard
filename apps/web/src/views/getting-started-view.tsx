import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { PROJECT_REPOSITORY_URL } from '@/lib/project-metadata';

const setupSteps = [
  {
    title: '1. Start with demo data',
    body: 'Prove the local dashboard, migrations, and P0 views before asking for GitHub credentials.',
    command: 'pnpm install && cp .env.example .env && pnpm infra:up && pnpm smoke:demo && pnpm web',
  },
  {
    title: '2. Create a temporary classic PAT',
    body: 'Use a short-lived classic PAT owned by an approved org owner, billing manager, or Copilot admin. Keep it collector-side only.',
    command: 'Scopes: read:org + manage_billing:copilot; optional repo or public_repo for delivery preview',
  },
  {
    title: '3. Configure the collector',
    body: 'Set the token and org slug in .env. Do not add GITHUB_TOKEN to the web app environment.',
    command: 'GITHUB_TOKEN=ghp_...\nGITHUB_ORGS=your-org-slug\nGITHUB_INGEST_DELIVERY=false',
  },
  {
    title: '4. Run preflight checks',
    body: 'Validate env wiring first, then validate DB connectivity and GitHub token scopes without ingesting facts.',
    command: 'pnpm smoke:collector-config\npnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check',
  },
  {
    title: '5. Backfill a small window',
    body: 'Start with a few completed UTC days, then expand to the reporting window after the org appears in the dashboard.',
    command: 'pnpm collect:backfill --from <yyyy-mm-dd> --to <yyyy-mm-dd> --concurrency 1',
  },
  {
    title: '6. Verify and schedule',
    body: 'Check Overview and Settings -> Ingestion status, tune value assumptions, then schedule daily collection.',
    command: 'pnpm collect --concurrency 1',
  },
] as const;

const views = [
  ['Overview', 'Executive value story: dollars saved, hours saved, ROI, spend-vs-value, and supporting evidence.'],
  ['Adoption', 'Active-user, engagement, acceptance-rate, IDE, model, and funnel health.'],
  ['Code Generation', 'Generated output by language, feature, IDE, chat mode, and model.'],
  ['Pull Requests', 'Copilot-authored, merged, reviewed, and time-to-merge evidence.'],
  ['Cost & Spend', 'Seat cost, premium requests, AI credits, and unit economics.'],
  ['Calculator', 'Standalone what-if estimate that works without GitHub credentials.'],
  ['Settings', 'Value knobs, blend weights, privacy posture, and recent ingestion status.'],
] as const;

const commonIssues = [
  ['Missing required scopes', 'Add read:org for org-scope metrics, then rerun the collector check.'],
  ['Billing warning', 'Usage can load, but Cost & Spend and ROI need manage_billing:copilot.'],
  ['No orgs in the dashboard', 'Run demo seed or a real backfill, then select the org in the switcher.'],
  ['Cost values show -', 'Billing data or denominators are unavailable; the UI avoids misleading zeroes.'],
] as const;

export function GettingStartedView() {
  const docsHref = `${PROJECT_REPOSITORY_URL}/blob/main/docs/onboarding.md`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold">
            Copilot Metrics Dashboard
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/overview" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/calculator" className="text-muted-foreground hover:text-foreground">
              Calculator
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Safe real-account onboarding
            </div>
            <div className="space-y-3">
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Connect a GitHub org without guessing the setup steps.
              </h1>
              <p className="max-w-2xl text-balance text-lg text-muted-foreground">
                Start with demo data, validate a temporary GitHub token without writes, ingest a small date range,
                then expand to the reporting window once the org appears in the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/overview">Open dashboard</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={docsHref}>Read full onboarding docs</a>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Credential boundary</CardTitle>
              <CardDescription>
                The collector owns GitHub access. The web app must not receive outbound GitHub credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Use a temporary classic PAT for tests. Required org-scope metrics scope is{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">read:org</code>.
              </p>
              <p>
                Add <code className="rounded bg-muted px-1.5 py-0.5 text-xs">manage_billing:copilot</code>{' '}
                when Cost & Spend and ROI need seat, premium-request, and AI-credit data.
              </p>
              <p className="text-muted-foreground">
                Fine-grained PATs are not supported by the billing endpoints. Revoke temporary tokens after evaluation.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Flow</p>
            <h2 className="text-2xl font-semibold tracking-tight">Recommended setup checklist</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {setupSteps.map((step) => (
              <Card key={step.title}>
                <CardHeader>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                  <CardDescription>{step.body}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                    <code>{step.command}</code>
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>How to use the app after data loads</CardTitle>
              <CardDescription>Each surface answers a different part of the value story.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {views.map(([name, description]) => (
                  <div key={name} className="grid gap-1 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common onboarding outcomes</CardTitle>
              <CardDescription>Use these as quick triage hints during real-account testing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commonIssues.map(([name, description]) => (
                  <div key={name} className="rounded-lg border p-3">
                    <div className="font-medium">{name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{description}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
