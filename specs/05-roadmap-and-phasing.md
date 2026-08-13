# 05 — Roadmap & Phasing

> **Launch-readiness authority:** [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md) is the canonical launch-readiness gate for P0/P1/P2 release decisions. This spec remains the roadmap and sequencing document. If a roadmap note in this file conflicts with a readiness gate in spec 08, spec 08 controls until this spec is updated.

This spec defines what ships when, what is explicitly out of scope at each phase, and the rough sequencing within each phase. Dates are not committed; phases are ordered by dependency and value, not calendar. Phase labels describe implementation order. Priority labels describe release readiness.

## Priority mapping

| Readiness priority | Roadmap meaning | Legacy phase content it absorbs |
| --- | --- | --- |
| **P0 — OSS Beta / core value story** | The public beta MUST prove the core value story with defensible math, realistic demo data, OSS project hygiene, and no launch-critical stubs. | Former Phase 1 data/value/collector/web work for the core v1 views: Overview, Cost & Spend, Adoption, Code Generation, Pull Requests, Calculator, and Settings. |
| **P1 — Production self-host readiness** | The project MUST be operationally credible before maintainers recommend production self-hosting. | Azure deployment artifacts, dashboard auth hardening, observability, backup/restore, release/versioning, and operations runbooks that were previously mixed into Phase 1/2 operations. |
| **P2 — Expansion / advanced analytics** | Optional expansion work MAY follow once P0 trust and P1 operations are established. It MUST stay hidden, preview-only, or absent until its gates pass. | GitHub Issues, Teams, GitHub App source auth, enterprise-scale rollups/cost centers, Fabric/OneLake, GHAS/Dependabot modules, Jira/Azure DevOps/Linear adapters, forecasting, anomaly detection, digests, and distribution polish unless specifically promoted by spec 08. |

The absence of Delivery Velocity, Engineering Health advanced views, GitHub Issues/Tickets, Teams, GHAS/Dependabot, Fabric/OneLake, Jira, Azure DevOps, Linear, forecasting, anomaly detection, or digest integrations MUST NOT block P0 OSS Beta. These items MUST NOT appear as first-class launch surfaces unless the applicable P1/P2 gates in spec 08 pass.

---

## Phase 0 — Repository foundations (historical baseline)

The repository foundation phase established the monorepo and local development skeleton:

- pnpm workspaces, strict TypeScript, root package scripts, and shared `tsconfig.base.json`.
- `.env.example`, `.gitignore`, `LICENSE`, README, and the initial `specs/` set.
- Local Postgres through `infra/docker-compose.yml`.
- Package layout for `apps/web`, `apps/collector`, `packages/contracts`, `packages/db`, and `packages/value`.

**Exit criteria:** a fresh clone can install dependencies and start local infrastructure with the documented commands (`pnpm install`, `pnpm infra:up`, `pnpm db:migrate`).

---

## Phase 1 — P0 OSS Beta / core value story

Phase 1 is the P0 launch path. By the end of this phase, a user MUST be able to run the demo path without GitHub credentials, understand the value methodology, and populate the same core views with real GitHub Copilot data when credentials are configured.

### Workstream A — Data, contracts, and value engine

- `packages/db` — Drizzle schema and migrations for the P0 silver/gold tables needed by the core views.
- `packages/contracts` — ts-rest contracts for P0 read endpoints and shared Zod schemas for source parsing.
- `packages/value` — pure implementations of the Activity, Output, and Delivery estimators from spec 02, with transparent knob inputs and tests.
- Settings and knob persistence sufficient to explain and reproduce every displayed hour, dollar, ROI, and unit-economics value, using the canonical `value_translation_knobs` settings key and gold-row knob snapshots.

### Workstream B — Collector and ingestion

- GitHub API client with auth, retry, pagination, rate-limit handling, and explicit configuration checks.
- Org, user, user-team, billing usage, AI credits, and PR-related Copilot Metrics ingestion needed by P0 views.
- Backfill mode over a day range using idempotent silver upserts and `ingestion_run` checkpoints.
- Bronze NDJSON persistence under `./data/bronze/...` before parsing.
- Gold rebuilds after silver writes so Overview, Cost & Spend, Adoption, Code Generation, Pull Requests, and Settings stay coherent. Gold rebuilds after knob changes remain collector-owned or explicitly queued; the web app MUST NOT imply immediate recomputation unless a rebuild was actually started or queued.
- Local Parquet export MAY remain as a lakehouse utility, but native Fabric/OneLake support is P2 and is not a P0 gate unless spec 08 promotes it.

### Workstream C — Web app and demo readiness

- Next.js App Router dashboard using the shared contracts and read-only database access.
- P0 first-class views: Overview, Cost & Spend, Adoption, Code Generation, Pull Requests, Calculator, and Settings.
- Realistic deterministic demo seed for `demo-org` that populates at least 90 days across all P0 views and is safe to re-run or clear without deleting customer data.
- "How is this calculated?" explanations on every derived metric, including formulas and current knob values.
- Null-safe charts and empty states that distinguish unavailable, zero, and missing-denominator conditions.
- No per-developer leaderboards, rankings, or surveillance affordances.

Delivery Velocity and Engineering Health MAY exist only as clearly labeled preview/advanced surfaces. They are not P0 launch blockers and MUST NOT dilute the Overview's core value story.

### Workstream D — P0 launch gates

P0 completion is gate-based, not merely code-complete. The beta MUST satisfy spec 08's P0 checklist, including:

- README quickstart for demo mode and real-data mode using current scripts (`pnpm db:seed:demo`, `pnpm collect`, `pnpm collect:backfill`, `pnpm web`). Older `pnpm bootstrap` examples MUST NOT be used.
- Public OSS artifacts: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue templates, and a pull request template with Constitution/spec checks.
- CI checks for install, typecheck, lint, test, build, migration, collector configuration smoke, and demo smoke.
- Demo smoke proof that every P0 view is populated and no first-class placeholder tabs are present.
- Privacy/auth documentation covering credentials, pseudonymization, read/write separation, and retention.
- Release notes that state beta status and known limitations without claiming production readiness unless P1 gates also pass.

### Phase 1 exit criteria

A P0 beta candidate exits Phase 1 only when:

1. A fresh user can run `pnpm install`, `pnpm infra:up`, `pnpm db:migrate`, `pnpm db:seed:demo`, and `pnpm web`, then see a populated demo dashboard.
2. A configured user can set `GITHUB_TOKEN` and `GITHUB_ORGS`, run `pnpm collect` or `pnpm collect:backfill`, and see the P0 views populated with real org data.
3. Overview answers the core question: what Copilot saved, what it cost, ROI/net value, methodology basis, adoption context, and PR evidence.
4. Calculator works without GitHub credentials or a database connection.
5. Settings lets an admin change value knobs and either see collector-owned derived-value recomputation progress or receive explicit guidance that derived values update after the next collector gold rebuild; in both cases the methodology remains auditable through current knobs and gold-row snapshots.
6. OSS artifacts, docs, CI checks, and demo smoke satisfy spec 08's P0 gates.
7. No P1/P2 surface appears as an unlabeled first-class launch blocker or empty tab.

---

## Phase 2 — P1 Production self-host readiness

Phase 2 hardens the P0 beta into a self-hosted production recommendation. It does not change the core value story; it makes installation, operations, recovery, and security credible.

Current P1 hardening materials are indexed from the README and governed by [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md): [`../docs/auth.md`](../docs/auth.md), [`../docs/observability.md`](../docs/observability.md), [`../docs/production-runbook.md`](../docs/production-runbook.md), and [`../infra/bicep/README.md`](../infra/bicep/README.md). These artifacts document the intended self-host path and current caveats, but they do not change the exit criteria below until deployment, auth, alerting, and restore gates are validated.

### Deployment topology

- Azure Container Apps artifact for the web app.
- Azure Container Apps Job, scheduled job, or equivalent controlled runner for the collector.
- Azure Database for PostgreSQL Flexible Server.
- Azure Key Vault for secrets.
- Azure Log Analytics for logs and diagnostics.
- Managed identity or least-privilege secret access where available.
- Separate database roles for read-only web access and collector write access.
- Documented environment variables, sizing assumptions, single-region defaults, and upgrade path.

### Auth hardening

P1 MUST provide production-credible dashboard access control or a hardened shared-password fallback with explicit risk documentation. It MUST protect dashboard views, document session/secret rotation, and preserve read/write separation so the web app never receives outbound GitHub credentials.

GitHub App auth for enterprise source ingestion remains P2 by default. It MAY be promoted only through the spec 08 readiness gates; it is not the same requirement as P1 dashboard access hardening.

### Observability and operations

- Health and readiness checks for the web app.
- Collector run status, duration, row counts, checkpoint state, stale-data state, and error summaries.
- Structured logs with no tokens, raw credentials, or sensitive payloads.
- Log Analytics queries or dashboards for failed ingestion, stale gold data, migration failures, and web availability.
- Alerting guidance for failed scheduled runs, repeated API errors, storage exhaustion, and stale data.
- Release/versioning workflow for web and collector images.
- Runbooks for deployment, upgrade, backfill, daily schedule, secret rotation, stuck ingestion, failed gold rebuild, expired credentials, and database connectivity failures.

Weekly Teams/Slack executive digests are P2 product integrations, not P1 operational alerting gates.

### Backup and restore

- Postgres backup configuration, retention, and point-in-time restore expectations.
- Bronze retention location, default retention, and replay expectations.
- Restore runbooks for database loss, partial ingestion failure, and bad knob/methodology rollout.
- Migration rollback or forward-fix posture.
- Export/archive guidance for customers with external retention needs.

A release MUST NOT claim production self-host readiness until restore has been exercised against a non-production environment.

### Phase 2 exit criteria

P1 is complete when spec 08's P1 checklist passes: documented Azure deployment from a clean tag, production-credible dashboard auth, separated read/write database access, observable web and collector health, scheduled collector recovery, tested backup/restore, secret management outside code/images, and deployment/upgrade/incident runbooks.

---

## Phase 3 — P2 Expansion / advanced analytics

Phase 3 expands the product after P0 trust and P1 operations are established. P2 work can be strategically important, but it MUST NOT block P0 OSS Beta or P1 production self-host readiness unless spec 08 explicitly promotes it.

### Outcome correlation: GitHub Issues and tickets

- GitHub Issues ingestion through a checkpointed, idempotent collector module.
- Lakehouse-shaped issue/ticket facts and repo dimensions, with raw-source retention where possible.
- Copilot-user overlay for closed issues only when privacy, sample-size, and attribution caveats are clear.
- Cycle-time, throughput, and delivery-delta metrics only after formulas, denominators, and minimum sample thresholds are specified.
- Tickets view hidden or feature-flagged until demo data, tests, contracts, and methodology gates pass.

### Teams and scorecards

- Team-level gold facts derived from `bridge_user_team` and user/org facts.
- Team scorecards for adoption, code generation, PR evidence, value, and ROI.
- Privacy threshold: teams with fewer than 5 active users MUST be suppressed with an explanation tile.
- No sortable per-developer leaderboard or individual performance ranking.

### Enterprise source scope and GitHub App auth

- Enterprise endpoint variants for collector modules. Preview `GITHUB_ENTERPRISE` configuration MAY exist before this phase, but P0 documentation MUST NOT claim enterprise-scale readiness until these gates pass.
- GitHub App auth and per-org installation flow for source ingestion.
- Multi-org dashboard topology, cross-org rollups, and cost-center tagging where source data supports it.
- Enterprise and cost-center facts that preserve the lakehouse-shaped schema.

These are P2 by default. If an early customer requires one of them for a release, spec 08 MUST be updated to promote the specific gate and acceptance criteria.

### Native Fabric / OneLake and Power BI

- Direct OneLake/Fabric writer for bronze, silver, and gold outputs.
- Idempotent and recoverable writes that preserve replay semantics.
- Power BI or Fabric semantic-model examples that do not require schema drift from Postgres.
- End-to-end lakehouse mirroring documentation.

### Non-GitHub trackers

- Adapter interface and implementations for Azure DevOps, Jira Cloud, and Linear.
- Common ticket schema that avoids leaking source-specific fields into user-facing formulas.
- V5/Tickets extension to slice by source once source quality and methodology gates pass.
- Independent enable/disable controls and documented auth, retry, pagination, and rate-limit behavior per adapter.

### Security modules

GHAS, Dependabot, or Security Health modules MAY ship only as optional P2 modules tied to Copilot-assisted value such as Autofix-assisted remediation or defensible remediation-time deltas. They MUST NOT become a broad security posture dashboard and MUST NOT be rolled into Copilot ROI without an explicit Copilot value mechanism.

### Distribution and product polish

The following are demand-driven P2 or post-P2 items and MUST NOT block P0/P1:

- AI-generated executive summary.
- Customer-ready PDF export.
- Teams/Slack weekly digest webhook.
- Marketplace, Cloud Foundry, Heroku-button, or equivalent one-click deploys.
- Embed mode.
- i18n.
- Forecasting and anomaly detection, once confidence limits and historical-data requirements are documented.

### Phase 3 exit criteria

A P2 feature MAY become visible only when spec 08's P2 decision gates pass: source ingestion and retention are trustworthy, formulas and thresholds are specified, privacy impact is reviewed, demo data is realistic, contracts/migrations/tests/docs are complete, and the feature does not weaken the P0 Overview value story.

---

## Explicit scope cuts

These remain out of scope until evidence and specs justify them:

- Real-time streaming of Copilot events. The available source APIs are daily-batch; the product mirrors that.
- ML-based forecasting presented as audited savings. Forecasts MAY be added only with clear confidence limits and historical context.
- Per-developer leaderboards, rankings, or surveillance tooling.
- Custom code analysis such as "Copilot wrote a bug here." That is outside the Copilot Metrics API surface.
- White-label or multi-tenant SaaS hosting. OSS-first, customer-controlled self-hosting remains the model.

## Open questions

- **P1 auth default:** SHOULD production self-host readiness require GitHub OAuth, or is a hardened shared-password fallback acceptable for the first production-ready release?
- **P1 preview boundary:** SHOULD Delivery Velocity and Engineering Health remain P1 preview surfaces, or move fully to P2 until issue/ticket ingestion is mature?
- **Local export vs Fabric path:** Local Parquet export can remain a utility, but SHOULD P1 include scheduled ADLS Gen2 export before the full P2 Fabric/OneLake writer?
- **Tracker priority order:** After GitHub Issues, SHOULD Azure DevOps, Jira, or Linear be the first non-GitHub tracker adapter?
- **Security scope:** Which Copilot Autofix or GHAS fields are sufficiently available and auditable to support a Copilot-specific security value story?
