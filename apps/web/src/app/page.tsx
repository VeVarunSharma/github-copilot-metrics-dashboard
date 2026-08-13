import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { db, dimOrg, factOrgDaily, factRoiDaily } from '@ghcp-dash/db';
import { count, desc, eq, sql } from 'drizzle-orm';
import { formatCurrency, formatHours } from '@/lib/format';
import { PROJECT_REPOSITORY_URL } from '@/lib/project-metadata';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';

async function getDemoHeadline(): Promise<{ orgCount: number; demoExists: boolean; mtdDollars: number; mtdHours: number } | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const orgsRow = await db.select({ n: count() }).from(dimOrg);
    const orgCount = Number(orgsRow[0]?.n ?? 0);
    const demoExistsRow = await db.select({ n: count() }).from(dimOrg).where(eq(dimOrg.orgId, 'demo-org'));
    const demoExists = Number(demoExistsRow[0]?.n ?? 0) > 0;
    if (!demoExists) return { orgCount, demoExists, mtdDollars: 0, mtdHours: 0 };
    const totals = await db
      .select({
        hours: sql<string>`coalesce(sum(${factRoiDaily.hoursSavedBlended}), 0)`,
        dollars: sql<string>`coalesce(sum(${factRoiDaily.dollarsSavedBlended}), 0)`,
      })
      .from(factRoiDaily)
      .where(eq(factRoiDaily.orgId, 'demo-org'));
    return {
      orgCount,
      demoExists,
      mtdDollars: Number(totals[0]?.dollars ?? 0),
      mtdHours: Number(totals[0]?.hours ?? 0),
    };
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const stats = await getDemoHeadline();
  const demoHref = stats?.demoExists ? '/overview?orgId=demo-org' : '/overview';
  const hasAnyOrg = (stats?.orgCount ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      {/* Top nav */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><BarChart3 className="size-5" aria-hidden /></span>
            <span>Copilot Metrics Dashboard</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/getting-started" className="hidden text-muted-foreground hover:text-foreground sm:inline-block">Setup</Link>
            <Link href="/calculator" className="hidden text-muted-foreground hover:text-foreground sm:inline-block">Calculator</Link>
            <Link href={demoHref} className="rounded-md border px-3 py-1.5 transition hover:bg-accent">View demo</Link>
            <a href={PROJECT_REPOSITORY_URL} className="hidden text-muted-foreground hover:text-foreground sm:inline-block">GitHub</a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          OSS · self-host · Azure-ready
        </div>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Tell the <span className="bg-gradient-to-r from-primary to-copilot bg-clip-text text-transparent">value story</span><br />
          of GitHub Copilot.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          GitHub&apos;s native dashboard shows you 28 days of usage. This shows you <strong>dollars saved</strong>, <strong>ROI</strong>, and <strong>delivered work</strong> — backed by a transparent, defensible methodology your CFO can audit.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href={demoHref}
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground shadow-sm transition hover:bg-primary-hover"
          >
            View the demo dashboard →
          </Link>
          <Link
            href="/calculator"
            className="inline-flex h-12 items-center justify-center rounded-md border bg-background px-6 text-base font-medium shadow-sm transition hover:bg-accent"
          >
            Try the savings calculator
          </Link>
          <Link
            href="/getting-started"
            className="inline-flex h-12 items-center justify-center rounded-md border bg-background px-6 text-base font-medium shadow-sm transition hover:bg-accent"
          >
            Connect GitHub data
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No signup. No login. The demo dashboard runs on synthetic data shaped like a 35-developer org.</p>

        {stats?.demoExists && stats.mtdDollars > 0 ? (
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-4 text-left">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Demo · time saved</div>
              <div className="mt-1 text-2xl font-semibold">{formatHours(stats.mtdHours)}</div>
            </div>
            <div className="rounded-lg border bg-background p-4 text-left">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Demo · dollars saved</div>
              <div className="mt-1 text-2xl font-semibold">{formatCurrency(stats.mtdDollars, 'USD')}</div>
            </div>
            <div className="rounded-lg border bg-background p-4 text-left">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Orgs in this instance</div>
              <div className="mt-1 text-2xl font-semibold">{stats.orgCount}</div>
            </div>
          </div>
        ) : null}

        {!hasAnyOrg ? (
          <div className="mx-auto mt-12 max-w-2xl rounded-lg border border-dashed bg-background/60 p-6 text-left text-sm">
            <p className="font-medium">Your local DB has no orgs yet.</p>
            <p className="mt-2 text-muted-foreground">
              Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm db:seed:demo</code> to populate 90 days of synthetic data, or set <code className="rounded bg-muted px-1.5 py-0.5">GITHUB_TOKEN</code> in <code className="rounded bg-muted px-1.5 py-0.5">.env</code> and run <code className="rounded bg-muted px-1.5 py-0.5">pnpm collect</code>.
              See <Link href="/getting-started" className="font-medium text-link underline underline-offset-4">Setup</Link> for the safe real-account test flow.
            </p>
          </div>
        ) : null}
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-10 text-center text-2xl font-bold">Why customers ask for this</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Long-horizon ingestion"
            body="GitHub keeps 28 days of Copilot metrics. We keep them forever, with up to a year of backfill. Per-day, per-org, per-user, per-team."
          />
          <FeatureCard
            title="Defensible math"
            body="Three estimators side by side — Activity, Output, Delivery — every dollar traceable to explicit, tunable knobs. CFOs can audit every chart."
          />
          <FeatureCard
            title="Cost-aware ROI"
            body="Pulls seats, premium-request spend, and AI credits alongside usage. Shows net value after spend, not just gross."
          />
          <FeatureCard
            title="Delivery correlation"
            body="Ties Copilot usage to merged PRs and (Phase 1+) issues. The strongest single value signal — already in the API."
          />
          <FeatureCard
            title="Standalone calculator"
            body="What-if any team size, cost basis, or usage assumption. Live in your browser, no install, no API key, share via URL."
          />
          <FeatureCard
            title="Lakehouse-ready"
            body="Schema designed to mirror cleanly into OneLake / Fabric. Parquet export today; native writer in the roadmap."
          />
        </div>

        <div className="mt-16 text-center">
          <Link
            href={demoHref}
            className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background shadow-sm transition hover:opacity-90"
          >
            View the demo dashboard →
          </Link>
        </div>
      </section>

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <div>MIT licensed. OSS. Deploy to Azure or run with docker-compose.</div>
          <div className="flex gap-4">
            <Link href="/calculator" className="hover:text-foreground">Calculator</Link>
            <Link href={demoHref} className="hover:text-foreground">Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-background p-6 transition hover:shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
