# Architecture

> A 5-minute orientation to this codebase, written following the [architecture.md/](https://architecture.md/) template and grounded in well-known patterns from [awesome-software-architecture](https://github.com/mehdihadeli/awesome-software-architecture). This is a **living document** — update it in the same PR as any change to components, integrations, deployment, or data stores. For the *why* behind every decision, see [`specs/03-architecture.md`](./specs/03-architecture.md).

## TL;DR

**GitHub Copilot Metrics Dashboard** is an OSS dashboard + ingestion CLI that turns GitHub Copilot's daily usage metrics into a **defensible value story** (time saved → dollars saved → ROI). The collector (Node) pulls from three GitHub API families daily, lands raw bytes to disk as bronze, normalizes them into a Kimball-style Postgres silver layer, and computes a gold layer via a pure-function value engine. A Next.js dashboard renders the gold data with full traceability ("how is this calculated?" on every metric). Customers self-host; Azure Container Apps + Postgres Flex is the primary P1 target, but production self-host readiness is not claimed until the P1 gates in [`specs/08-launch-readiness-and-priorities.md`](./specs/08-launch-readiness-and-priorities.md) pass. Microsoft Fabric / OneLake is P2 expansion.

---

## 1. Project Structure

```
github-copilot-metrics-dashboard/
├── apps/
│   ├── web/                          # Next.js 15 dashboard (App Router, React Server Components)
│   └── collector/                    # Node CLI: ingestion + gold rebuild + parquet export
├── packages/
│   ├── contracts/                    # ts-rest router + Zod schemas (HTTP + GitHub API)
│   ├── db/                           # Drizzle schema, client, migrations, seed
│   └── value/                        # Pure-function value translation engine (the domain core)
├── infra/
│   ├── docker-compose.yml            # Local dev: Postgres + Adminer
│   ├── docker/                       # Dockerfiles for web + collector
│   ├── bicep/                        # P1 Azure deployment target artifacts, incl. migration job
│   └── postgres/                     # Operator-run Postgres role bootstrap SQL
├── specs/
│   ├── CONSTITUTION.md               # Non-negotiable principles (versioned)
│   ├── README.md                     # Spec index + four-layer guidance hierarchy
│   └── 00–08*.md                     # Nine design specs, including launch readiness
├── .github/
│   ├── copilot-instructions.md       # GitHub Copilot pointer
│   ├── instructions/*.instructions.md # Path-scoped agent overlays (applyTo: glob)
│   └── workflows/                    # GitHub Actions: CI gates + tag-triggered release publishing
│       ├── ci.yml                    # PR/main typecheck/lint/test/build/smoke gates
│       └── release.yml               # v* tag validation, GHCR image push, GitHub Release notes
├── data/                             # Bronze NDJSON storage (gitignored)
├── exports/                          # Parquet exports (gitignored)
├── AGENTS.md                         # AI agent operational quick-reference
├── ARCHITECTURE.md                   # This file
└── README.md                         # User-facing intro + quick start
```

---

## 2. High-Level System Diagram

```
                              GitHub.com
                  ┌────────────────────────────────────┐
                  │  Copilot Metrics API               │
                  │  Billing Usage API                 │
                  │  AI Credits API                    │
                  └──────────────┬─────────────────────┘
                                 │ HTTPS · classic PAT
                                 │ (org scope; enterprise preview)
                                 ▼
   ┌─────────────────────────────────────────────────────────┐
   │  apps/collector  (Node CLI, runs daily as a CAE Job)    │
   │  github/client → download → bronze → silver upsert      │
   │                       │              │                  │
   │                       ▼              ▼                  │
   │             ./data/bronze/    silver upserts            │
   │             (raw NDJSON,      (idempotent,              │
   │              90-day retention) onConflictDoUpdate)      │
   │                                      │                  │
   │                                      ▼                  │
   │                          packages/value (pure fns)      │
   │                                      │                  │
   │                                      ▼                  │
   │                              gold rebuild               │
   └────────────────────────────┬────────────────────────────┘
                                ▼
                  ┌────────────────────────────┐
                  │  Postgres 16               │
                  │  • dim_*  (orgs, users,    │
                  │            teams, langs…)  │
                  │  • silver (fact_org_daily, │
                  │            fact_user_*,    │
                  │            fact_billing_*) │
                  │  • gold   (fact_value_*,   │
                  │            fact_roi_*)     │
                  │  • settings, ingestion_run │
                  └────────────┬───────────────┘
                               │ Drizzle (READ-ONLY)
                               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  apps/web  (Next.js 15, RSC, ts-rest)                   │
   │  server/queries → Drizzle reads                         │
   │  server/handlers → ts-rest endpoints (incl.            │
   │            /api/metrics/unit-economics)                 │
   │  views/* → P0 dashboards (overview, adoption, code-gen, │
   │            PRs, cost, calculator, settings) plus        │
   │            labeled preview/advanced surfaces only       │
   └────────────────────────────┬────────────────────────────┘
                                │ HTTPS
                                ▼
                            ┌───────┐
                            │Browser│
                            └───────┘

   ──── Demo path ────
   pnpm db:seed:demo  →  synthesizes 90 days of "demo-org" data
   directly into silver + gold, bypassing GitHub entirely.

   ──── P2 expansion (planned) ────
   Postgres ─ mirror ─▶ OneLake / Microsoft Fabric (delta tables)
                        ↘ Power BI semantic model
```

---

## 3. Architecture Patterns

The codebase is intentionally built on six well-known patterns. Each is listed below with **where it lives in our code** and **why it's a fit**. Links go to the [awesome-software-architecture](https://github.com/mehdihadeli/awesome-software-architecture) catalog for deeper reading.

### 3.1 [Medallion Architecture](https://en.wikipedia.org/wiki/Data_lakehouse#Medallion_architecture) (Bronze / Silver / Gold)

**Where:** `./data/bronze/*.ndjson` (raw GitHub responses, retained for replay + audit) → Postgres silver fact tables (parsed, normalized, conflict-resolved) → Postgres gold tables (`fact_value_daily`, `fact_roi_daily`, `fact_team_value_daily` — computed by `packages/value`).

**Why:** Bronze is the contract with the data source (immutable, replayable). Silver is the contract with the application (queryable, denormalized for performance). Gold is the contract with the user (the dollars and hours on the dashboard). Re-computing gold after a knob change becomes a `DELETE + recompute`, never a re-download. A P2 OneLake mirror can lift silver/gold as delta tables with near-zero schema work.

**Mapped principle:** [Constitution P4 — Lakehouse-Shaped Schema](./specs/CONSTITUTION.md), P6 — Bronze Retention.

### 3.2 [Ports & Adapters (Hexagonal Architecture)](https://github.com/mehdihadeli/awesome-software-architecture/blob/main/docs/hexagonal-architecture.md)

**Where:** `packages/value` is the **pure domain core** — no I/O, no `Date.now()`, no random, no DB, no HTTP. It implements the three estimators (Activity, Output, Delivery), blending, and ROI as pure functions over plain-object inputs. `packages/db` (Postgres adapter via Drizzle) and `packages/contracts` (HTTP adapter via ts-rest + Zod) are outward adapters. The two apps (`apps/web`, `apps/collector`) wire the adapters to the core.

**Why:** the methodology — the most important and most contested part of the product — is testable in complete isolation (22 unit tests, no Postgres needed). And the day we swap Postgres for OneLake, the value engine never sees the change.

**Mapped principle:** [Constitution P9 — Transparent Methodology](./specs/CONSTITUTION.md).

### 3.3 [CQRS](https://github.com/mehdihadeli/awesome-software-architecture/blob/main/docs/cqrs/cqrs.md) (lite — shared DB, separate processes)

**Where:** `apps/collector` is the **command side** (writes silver + gold + ingestion_run). `apps/web` is the **query side** (reads silver + gold). They share only the database. The web app has zero outbound GitHub calls and zero write privileges in the P1 deployment topology.

**Why:** the web app can be deployed publicly (no GitHub creds in its environment), and the collector can run with a tighter blast radius as a scheduled job. Each side scales independently. This is "CQRS-lite" — we deliberately do *not* maintain separate read/write models or event sourcing; the database is the shared source of truth.

**Mapped principle:** [Constitution P3 — Read/Write Separation](./specs/CONSTITUTION.md).

### 3.4 [Contract-First / API-First Development](https://github.com/mehdihadeli/awesome-software-architecture/blob/main/docs/api-design.md)

**Where:** `packages/contracts` exports a single ts-rest router (`apiContract`) plus a set of Zod schemas. The web client (`src/server/handlers/*`), the web server, and the collector's NDJSON parsers all derive from the same contract — types and runtime validation in one place. Operational contracts such as `/api/health` use additive nullable fields for freshness signals so liveness/readiness semantics remain stable as observability expands.

**Why:** schema drift between client and server is impossible by construction. Adding a new endpoint requires a contract change, which forces a deliberate decision. Renaming a response field updates everywhere or fails to compile.

**Mapped principle:** [Constitution P7 — Contract-Driven Development](./specs/CONSTITUTION.md).

### 3.5 [Dimensional Modeling (Kimball)](https://en.wikipedia.org/wiki/Dimensional_modeling)

**Where:** Postgres schema is laid out as 7 dimensions (`dim_org`, `dim_user`, `dim_team`, `dim_feature`, `dim_ide`, `dim_language`, `dim_model`) + facts grouped by grain (`fact_org_daily`, `fact_user_daily`, `fact_billing_daily`, etc.) + degenerate dimensions on the facts. Composite primary keys are the natural keys (e.g. `(org_id, day)` for `fact_org_daily`).

**Why:** BI-friendly. Queryable from Power BI without semantic-model gymnastics. Maps 1:1 to OneLake delta tables for the P2 Fabric mirror. Fact-on-dimension joins are predictable for query planning.

**Mapped principle:** [Constitution P4 — Lakehouse-Shaped Schema](./specs/CONSTITUTION.md).

### 3.6 [Modular Monolith (Modulith)](https://en.wikipedia.org/wiki/Modular_programming)

**Where:** pnpm workspace with 5 packages, but only **two deployable units** — `apps/web` (HTTP service) and `apps/collector` (scheduled CLI). Module boundaries enforced at the package level; no app reaches into another app.

**Why:** operational simplicity of a monolith (two containers, one DB, one CI pipeline) with module-level decoupling. We can split a package into its own service later only when scaling, team boundaries, or release cadence demand it. The current scale doesn't justify microservices overhead.

---

## 4. Core Components

### 4.1 `apps/web` — Dashboard
- **Purpose:** customer-facing dashboard for the P0 views: landing, public getting-started/onboarding guide, overview, adoption, code-generation, pull-requests, cost, calculator (public), settings, and `/login`. Delivery Velocity, Engineering Health, and Consumption Patterns are preview/advanced surfaces only until their readiness gates pass.
- **Tech:** Next.js 15 (App Router) · Tailwind CSS v3 · shadcn/ui (copied primitives in `src/components/ui/`) · Recharts (client components only) · ts-rest client.
- **URL state:** org selection is carried by `?orgId=`; the switcher reflects a real URL-selected org and top-nav links preserve it. Unknown operational dates are rendered as `—`, never as synthetic fallback dates.
- **Charts:** Recharts under the hood, with [EvilCharts](https://evilcharts.com) (a shadcn-style registry of animated, design-first chart components built on Recharts) used in newer preview/advanced views (Delivery Velocity, Engineering Health). Consumption Patterns currently reuses the existing chart wrappers for Pareto, cohort, team, and model-spend views. Existing P0 views continue to use our hand-rolled `<StackedAreaChart>` / `<LineChart>` wrappers in `src/components/charts/*.tsx`.
- **Deployment:** P1 target is Azure Container App with HTTP ingress on port 3000. Min replicas 1.
- **Read more:** [`specs/04-ui-and-views.md`](./specs/04-ui-and-views.md), [`.github/instructions/apps-web.instructions.md`](./.github/instructions/apps-web.instructions.md).

### 4.2 `apps/collector` — Ingestion CLI
- **Purpose:** pulls daily Copilot data from GitHub, persists bronze NDJSON, upserts silver, rebuilds gold. Commands: `collect`, `backfill`, `seed`, `gold`, `export-parquet`. Org scope is the P0 readiness target; enterprise endpoint variants are preview/advanced until spec 08 promotes enterprise-scale gates.
- **Tech:** Node 20 · commander · pino · drizzle-orm · @ghcp-dash/contracts (for Zod parsers).
- **Deployment:** P1 target is Azure Container Apps Job, cron `0 4 * * *` (daily 04:00 UTC).
- **Read more:** [`specs/01-data-sources-and-model.md`](./specs/01-data-sources-and-model.md), [`.github/instructions/apps-collector.instructions.md`](./.github/instructions/apps-collector.instructions.md).

### 4.3 `packages/contracts` — API contracts
- **Purpose:** ts-rest router for the web HTTP API + Zod schemas for parsing GitHub API responses. Single source of truth.
- **Tech:** `@ts-rest/core` · Zod.
- **Adapter role:** the HTTP adapter in the hexagonal layout.

### 4.4 `packages/db` — Schema + persistence adapter
- **Purpose:** Drizzle schema (25 tables), migration runner, connection pool, seed script (`pnpm db:seed`, `db:seed:demo`, etc.).
- **Tech:** Drizzle ORM · postgres (postgres-js driver) · drizzle-kit (for `db:generate`).
- **Adapter role:** the persistence adapter in the hexagonal layout.

### 4.5 `packages/value` — Domain core
- **Purpose:** pure functions implementing the three estimators (Activity / Output / Delivery), blending, ROI, snapshot serialization, knob validation. Zero side effects. 22 unit tests.
- **Tech:** TypeScript · Vitest. **No runtime dependencies.**
- **Domain role:** the hexagon's core. Everything else adapts to it.
- **Read more:** [`specs/02-value-translation.md`](./specs/02-value-translation.md), [`.github/instructions/packages-value.instructions.md`](./.github/instructions/packages-value.instructions.md).

### 4.6 `infra/` — Deployment artifacts
- `docker-compose.yml` — local Postgres + Adminer.
- `docker/Dockerfile.web` and `docker/Dockerfile.collector` — multi-stage builds, non-root, Node 20-alpine.
- `bicep/main.bicep` — single-region Azure P1 foundation deployed via `azd` (ACR, Container Apps environment, web app, migration/bootstrap job, collector job, Postgres Flex, Key Vault, Log Analytics, managed identities, Azure Storage for bronze, optional Entra built-in auth, and optional Azure Monitor alerts + `/api/health` availability test). Production self-host readiness still depends on the full P1 checklist in spec 08.
- `postgres/bootstrap-roles.sql` — repeatable operator-run role/grant bootstrap for `web_readonly`, `collector_writer`, and `migration_admin`. Bicep provisions a migration/bootstrap job that uses the migration DB URL for Drizzle migrations and production-safe seed, but SQL role bootstrap remains operator-run.
- P1 readiness materials are indexed in the README: [`docs/auth.md`](./docs/auth.md), [`docs/observability.md`](./docs/observability.md), [`docs/production-runbook.md`](./docs/production-runbook.md), and [`infra/bicep/README.md`](./infra/bicep/README.md). They document the current self-host path and caveats; they do not assert production readiness.

---

## 5. Data Stores

### 5.1 Postgres 16 (primary store)

| Layer | Tables | Purpose | Readiness |
|---|---|---|---|
| **Dimensions** | `dim_org`, `dim_user`, `dim_team`, `dim_feature`, `dim_ide`, `dim_language`, `dim_model` | Reference data, seeded at install (`pnpm db:seed`). | P0 |
| **Dimensions — delivery** | `dim_repo` | Stable repository dimension for delivery and quality facts. | P1 preview |
| **Silver — org** | `fact_org_daily`, `fact_org_daily_by_feature`, `fact_org_daily_by_ide`, `fact_org_daily_by_language_feature`, `fact_org_daily_by_language_model`, `fact_org_daily_by_model_feature` | Normalized daily org metrics from the Metrics API. | P0 |
| **Silver — user** | `fact_user_daily`, `fact_user_daily_by_feature`, `fact_user_daily_by_ide`, `fact_user_daily_by_language_feature`, `fact_user_daily_by_language_model`, `fact_user_daily_by_model_feature`, `bridge_user_team` | Per-user activity and model mix for team/cohort aggregation; public per-developer rankings and selected-user surveillance affordances remain prohibited. | P0 / P1 preview |
| **Silver — cost** | `fact_billing_daily`, `fact_ai_credits_daily` | Seat cost, premium-request spend, and AI-credit model spend when billing scope is available; billing-derived views render unavailable when AI-credit facts are absent. | P0 |
| **Silver — delivery** | `fact_release_daily` | Release/deployment aggregates from GH Releases for DORA and feature-release context. | P1 preview |
| **Silver — CI** | `fact_workflow_run_daily` | GitHub Actions run counts and timing aggregates for engineering-health metrics. | P1 preview |
| **Silver — commits** | `fact_commit_daily` | Privacy-preserving commit activity aggregates for delivery context and lead-time joins. | P1 preview |
| **Gold (computed)** | `fact_value_daily` (per estimator), `fact_roi_daily`, `fact_team_value_daily` | Derived from silver + knobs by `packages/value`. Rebuilt on knob change. | P0 |
| **Gold — DORA** | `fact_dora_daily` | DORA and delivery-context metrics recomputed from preview silver tables. | P1 preview |
| **Gold — CI** | `fact_ci_daily` | Engineering-health metrics derived from workflow runs, PR review data, and later dependency alerts. | P1 preview |
| **Operational** | `ingestion_run` (idempotency), `settings` (knobs + pseudonym salt) | Audit trail + config. | P0 |

Database administered via Drizzle migrations (`pnpm db:migrate`) and seeded via Drizzle inserts (`pnpm db:seed[:demo|:clear-demo|:reset]`). Connection pool max 10 (configurable via `DB_MAX_CONNECTIONS`).

### 5.2 Local file storage (collector only)

| Path | Purpose | Retention |
|---|---|---|
| `./data/bronze/{source}/{org}/{YYYY-MM-DD}.ndjson` | Raw GitHub responses, audit + replay source | 90 days default (configurable per source) |
| `./exports/silver/{table}.parquet` | Local Parquet export as a P2 Fabric / Power BI on-ramp | Overwritten on each `pnpm collect:export-parquet` |

---

## 6. External Integrations / APIs

### Today (P0 OSS Beta)

| Service | Endpoint family | Auth | Used for |
|---|---|---|---|
| **GitHub Copilot Metrics API** | `/orgs/{org}/copilot/metrics/reports/*`; enterprise variants are preview/advanced | Classic PAT: `read:org` for P0 org scope; enterprise preview requires `read:enterprise` or `manage_billing:copilot` | Daily org/user/team usage |
| **GitHub Billing Usage API** | `/organizations/{org}/settings/billing/usage`; enterprise variants are preview/advanced | Classic PAT: `manage_billing:copilot` | Seat cost + premium-request spend |
| **GitHub AI Credits API** | `/organizations/{org}/settings/billing/usage/ai-credits`; enterprise variants are preview/advanced | Classic PAT: `manage_billing:copilot` | Per-model AI credit usage |

All metrics endpoints return signed URLs to NDJSON files (not inline JSON). The collector follows the signed URLs without auth headers.

### P2 expansion
- **GitHub Issues / tickets** (REST + GraphQL) — additional outcome correlation after source, privacy, and methodology gates pass.
- **Azure DevOps Boards, Jira Cloud, Linear** — ticket throughput adapters.
- **GitHub App** — source-ingestion auth for enterprise-scale deployments. P1 still requires production-credible dashboard access control.
- **Microsoft Fabric / OneLake** — native silver/gold mirror as delta tables.
- **Power BI** — semantic model on top of Fabric Lakehouse.

---

## 7. Deployment & Infrastructure

| Concern | Local dev | Azure (target) |
|---|---|---|
| **Web** | `pnpm --filter @ghcp-dash/web start` (Node 20) | Container App, ingress on 3000, min replicas 1 |
| **Deploy** | local processes | `azd up` (provision + build/push images + deploy) via `azure.yaml` and the [`infra/main.bicep`](./infra/main.bicep) subscription-scoped wrapper |
| **Migration/bootstrap** | `DATABASE_URL=... pnpm db:bootstrap` | `azd` postprovision hook bootstraps least-privilege DB roles, runs migrations + production-safe seed as `migration_admin`, and verifies grants; a manual Container Apps Job remains for standalone runs |
| **Collector** | `pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect` | Container Apps Job, cron `0 4 * * *` |
| **Postgres** | `docker compose -f infra/docker-compose.yml up -d postgres` | Azure Postgres Flexible Server (small P1 target starts at Burstable B1ms) |
| **Container images** | Docker build smoke only | Tag-triggered GitHub Actions release publishes `ghcr.io/<owner>/<repo>-web` and `ghcr.io/<owner>/<repo>-collector` with release and commit tags plus release-note digests; Bicep accepts explicit image refs or uses its ACR fallback. |
| **Secrets** | `.env` file (gitignored) | Azure Key Vault with RBAC; secrets injected via CAE secret refs |
| **Bronze storage** | `./data/bronze` | Azure Storage account + Azure Files share mounted into the collector job |
| **Logs** | stdout (pino-pretty) | Log Analytics workspace attached to the CAE environment |
| **CI/release** | `pnpm -r typecheck && pnpm -r test && pnpm -r build` plus smoke checks | GitHub Actions (`.github/workflows/ci.yml`) gates PR/main with matrix Node 20 + 22 and Docker build smoke; `.github/workflows/release.yml` gates `v*` tags with Node 20 P0 validation, pushes GHCR web/collector images, and creates GitHub Release notes from `CHANGELOG.md`. |

Bicep template at [`infra/bicep/main.bicep`](./infra/bicep/main.bicep) is a single-region Azure P1 foundation deployed with the Azure Developer CLI (`azd up`) via the [`infra/main.bicep`](./infra/main.bicep) subscription-scoped wrapper and `azure.yaml`. It has explicit image, secret, sizing, storage, migration, schedule, auth, and alerting parameters, and accepts separate DB URL secrets. An `azd` postprovision hook ([`infra/hooks/postprovision.sh`](./infra/hooks/postprovision.sh)) runs [`infra/postgres/bootstrap-roles.sql`](./infra/postgres/bootstrap-roles.sql) to create the least-privilege `web_readonly`, `collector_writer`, and `migration_admin` roles, runs the DB migration runner plus the production-safe seed as `migration_admin`, and verifies grants. Microsoft Entra built-in auth (`enableEntraAuth`) and Azure Monitor alerts plus an `/api/health` availability test (`enableAlerts` / `enableAvailabilityTest`) are provisioned behind toggle params. This is not a complete enterprise landing zone (public ingress, no VNet/private endpoints); a release MUST NOT claim production self-host readiness until the complete P1 checklist in spec 08 passes.

---

## 8. Security Considerations

| Concern | How we address it |
|---|---|
| **Outbound credential blast radius** | Only the collector holds GitHub credentials. The web app has zero outbound GitHub calls (Constitution P3). |
| **Database role blast radius** | P1 guidance uses separate `web_readonly`, `collector_writer`, and `migration_admin` URLs. The migration/bootstrap job consumes only the migration URL. `infra/postgres/bootstrap-roles.sql` defines repeatable grants, now executed and verified by the `azd` postprovision hook; live validation of the pipeline in a real Azure rollout remains a P1 gate. |
| **GitHub auth scopes** | Validated on collector startup (`validateToken`). Scope requirements depend on configured `Scope[]`. Missing billing scope is a WARN, not fatal — billing endpoints silently no-op. |
| **PII protection** | User logins pseudonymized via SHA-256 + salt before display. UI surfaces only org/team-grain aggregates by default. No per-developer rankings ever (Constitution P2 + P9). |
| **Inbound auth** | `AUTH_MODE` controls app access: unset preserves the old default (`shared-password` when `DASHBOARD_PASSWORD` is set, otherwise `open`), `open` leaves dashboard routes public and rejects Settings mutations, `shared-password` uses a signed `httpOnly`, `sameSite=lax` cookie (`secure` in production, 12-hour max age), and `identity-header` trusts only `AUTH_IDENTITY_HEADER` from protected identity-aware ingress (default `x-ms-client-principal-name`). `/calculator`, `/login`, `/api/auth/*`, and `/api/health` stay public in protected modes. Azure Container Apps built-in auth with Entra ID is wired in Bicep (`enableEntraAuth`), which forces `identity-header` mode. P1 production-like deployments should use identity-aware ingress/OIDC (for example Entra ID, Azure Easy Auth, or an OIDC gateway/proxy) and must enforce any viewer/admin role split upstream until native dashboard OAuth/RBAC exists. |
| **Data at rest** | Azure Postgres Flexible Server (TLS in transit, AES-256 at rest by default). |
| **Container hardening** | Docker images run as non-root (UID 1000). |
| **Secrets management** | P1 Azure target uses Key Vault references. Plain `.env` only for local dev. |
| **Dependencies** | Dependabot enabled, weekly cadence (planned). |

---

## 9. Development & Testing Environment

**Quick start:** see [`AGENTS.md`](./AGENTS.md) for the canonical commands. Summary:

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d postgres
pnpm db:migrate
pnpm db:seed:demo                   # 90 days of synthetic data, no GitHub creds needed
pnpm --filter @ghcp-dash/web start  # http://localhost:3000
```

| Concern | Tool |
|---|---|
| **Type checking** | TypeScript 5.7 (strict; `pnpm -r typecheck`) |
| **Unit testing** | Vitest 2.1 (`pnpm -r test`) — 52 tests across 5 packages |
| **Integration testing** | Live Postgres via docker-compose (collector integration tests `.skip` pending testcontainers wiring in CI) |
| **Linting** | ESLint with `eslint-config-next` on `apps/web`; `echo ok` on other packages (TS strict is the main bar) |
| **Schema migrations** | drizzle-kit (`pnpm db:generate`) — emits SQL into `packages/db/drizzle/` |
| **Logging** | pino (collector); console + Next.js built-in (web) |

Local DB browser: Adminer at http://localhost:8080 (server: `postgres`, user/pass: `ghcp`, db: `ghcp_metrics`).

---

## 10. Future Considerations / Roadmap

Pulled from [`specs/05-roadmap-and-phasing.md`](./specs/05-roadmap-and-phasing.md):

- **P0 — OSS Beta / core value story**: Overview, Cost & Spend, Adoption, Code Generation, Pull Requests, Calculator, Settings, realistic demo data, and transparent methodology.
- **P1 — Production self-host readiness**: production-credible dashboard auth, Azure deployment, observability, separated read/write database access, backup/restore, and runbooks. Delivery Velocity, Engineering Health, and Consumption Patterns remain preview/advanced unless their gates pass.
- **P2 — Expansion / advanced analytics**: Tickets/Teams expansion, GitHub App source auth, third-party ticket adapters (AzDO / Jira / Linear), native OneLake / Fabric writer, Power BI, forecasting, and anomaly detection.

Architectural debt / opportunities (not blocking):

- **Concurrent dim upserts deadlock** — currently mitigated by `--concurrency 1`. Root fix: serialize dim writes or use advisory locks.
- **Schema file renames** — `packages/db/src/schema/facts-*.ts` could be `silver-*.ts` to make Medallion layering explicit in file names too. Pure rename, separate PR.
- **Commands directory** — `apps/web/src/server/commands/` doesn't exist yet because we only have one mutation endpoint (`PUT /api/settings/knobs`). Add when there are ≥ 3 mutations to surface the CQRS split in the file tree.
- **Migration regeneration** — initial migration was hand-written because `drizzle-kit` wasn't available at scaffold time. A clean `pnpm db:generate` will rewrite it; diff carefully before committing.

---

## 11. Project Identification

| Field | Value |
|---|---|
| **Project name** | GitHub Copilot Metrics Dashboard |
| **Repository URL** | https://github.com/microsoft/github-copilot-metrics-dashboard |
| **License** | MIT |
| **Distribution model** | OSS, customer-self-hosted |
| **Primary deploy target** | Azure (Container Apps + Postgres Flex) for P1, with P2 mirror to Microsoft Fabric |
| **Status** | P0 OSS Beta; production self-host readiness awaits P1 gates |
| **Last updated** | 2026-07-01 |

---

## 12. Glossary / Acronyms

| Term | Definition |
|---|---|
| **AGENTS.md** | Open standard ([agents.md](https://agents.md)) for AI agent quick-reference files. |
| **Bronze / Silver / Gold** | The three layers of the [Medallion lakehouse architecture](https://en.wikipedia.org/wiki/Data_lakehouse#Medallion_architecture). Raw → normalized → computed. |
| **CAE** | Container Apps Environment (Azure). |
| **CQRS** | Command Query Responsibility Segregation — separating write and read code paths. |
| **DAU / WAU / MAU** | Daily / Weekly / Monthly Active Users. |
| **GHCP** | GitHub Copilot. |
| **Hexagonal / Ports & Adapters** | Architectural pattern (Alistair Cockburn) — a pure domain core surrounded by adapters for I/O. |
| **Kimball** | Ralph Kimball's [dimensional modeling](https://en.wikipedia.org/wiki/Dimensional_modeling) for BI / data warehouses. |
| **Medallion** | See Bronze / Silver / Gold above. |
| **Modulith** | Modular monolith — one deployable, internally decomposed into modules. |
| **MTD** | Month-to-Date. |
| **MUST / SHOULD / MAY** | RFC 2119 normative keywords used throughout the constitution and specs. |
| **NDJSON** | Newline-Delimited JSON. The format GitHub's Copilot Metrics API returns via signed URLs. |
| **OneLake** | Microsoft Fabric's unified data lake. The P2 mirror target. |
| **PAT** | Personal Access Token (GitHub). Classic PAT required for the Billing endpoint. |
| **RSC** | React Server Component. Used by default in `apps/web`. |
| **ROI** | Return on Investment. In this product: `(dollars_saved − total_spend) / total_spend`. |
| **ts-rest** | A TypeScript library that defines an HTTP API as a single typed contract used by both client and server. |
