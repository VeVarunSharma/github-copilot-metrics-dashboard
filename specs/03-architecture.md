# 03 — Architecture

This spec defines the runtime components, deployment topology, contract-driven development pattern, and operational concerns.

## 1. Stack decisions (locked for v1)

| Concern              | Choice                                | Why                                                                                  |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| Language             | TypeScript                            | One language end-to-end; type-safe contracts via ts-rest.                            |
| Frontend framework   | Next.js 15 (App Router)               | Server components, route handlers, easy Azure deployment, large contributor base.    |
| API contract         | [ts-rest](https://ts-rest.com)        | Contract-driven dev: one schema, used by client + server + collector.                |
| UI components        | shadcn/ui + Tailwind CSS              | Copy-in components (no NPM lock-in), designable, accessible.                         |
| Charts               | Recharts                              | Composable React, no canvas headaches, plays nicely with shadcn.                     |
| Database             | Postgres 16                           | Battle-tested, lakehouse-pattern friendly, good Drizzle support.                     |
| ORM / migrations     | [Drizzle ORM](https://orm.drizzle.team)| Type-safe SQL, lightweight, zero magic, good for schema-as-code.                     |
| Validation           | Zod                                   | First-class with ts-rest, used in collector parsers + UI forms.                      |
| Backend runtime      | Node 20+                              | Stable, broad support; collector and Next.js both run here.                          |
| Local dev            | docker-compose                        | One command to bring up Postgres + the apps.                                         |
| Deploy target        | Azure Container Apps + Azure Postgres Flex | Lowest-friction managed Azure; aligns with Fabric/OneLake roadmap.              |
| Package manager      | pnpm                                  | Workspaces, content-addressable store, deterministic.                                |
| Testing              | Vitest                                | Fast, ESM-native, same syntax as Jest.                                              |

## 2. Repository layout

```
github-copilot-metrics-dashboard/
├── apps/
│   ├── web/                       # Next.js 15 dashboard + API route handlers
│   └── collector/                 # Node CLI: ingestion + backfill
├── packages/
│   ├── contracts/                 # ts-rest contracts (shared)
│   ├── db/                        # Drizzle schema + client + migrations
│   └── value/                     # Value-translation engine (pure functions)
├── infra/
│   ├── docker-compose.yml         # local dev: postgres + (optional) web + collector
│   ├── bicep/                     # Minimal Azure P1 foundation (not full P1 readiness)
│   └── github-actions/            # CI workflows
├── specs/                         # this folder
├── exports/                       # parquet exports land here (gitignored)
├── data/                          # bronze NDJSON storage (gitignored)
├── package.json                   # workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Why split `value` out of `web`?

The value-translation engine (`packages/value`) is pure functions over silver-shaped inputs. Splitting it lets:

- The collector use it to precompute gold tables nightly.
- The web app use it for ad-hoc what-if queries (e.g. "preview what the dashboard would look like if we set min_per_chat to 3 minutes").
- The standalone calculator import the same functions — single source of truth for the methodology.
- Tests run against the engine in isolation without spinning up a database.

## 3. Component responsibilities

### `apps/collector`

A Node CLI invokable via `pnpm collect` (default: pull yesterday's data) or `pnpm collect:backfill --from YYYY-MM-DD --to YYYY-MM-DD`. Idempotent — safe to re-run.

Responsibilities:

1. Read auth + org list from env.
2. For each org × source × day:
   - Check `ingestion_run` for an existing successful run; skip if found.
   - Call the Metrics/Billing endpoint; download NDJSON; persist to `./data/bronze/...`.
   - Parse with Zod schemas (defined in `packages/contracts`).
   - Upsert into silver tables via Drizzle.
   - Write an `ingestion_run` row.
3. After all silver writes complete, trigger gold recomputation (in-process; no external scheduler in v1).
4. Optionally export parquet via `--export-parquet ./exports/`.

The collector MUST be safe to invoke from cron, GitHub Actions, or Azure Container Apps Jobs without a queue or coordinator.

### `apps/web`

Next.js 15 App Router app. Two surfaces:

- **Dashboard pages** (`app/(dashboard)/...`) — server components for fast first paint, client components only where charts need interactivity.
- **API routes** (`app/api/[[...ts-rest]]/route.ts`) — single ts-rest router that mounts the contract from `packages/contracts`.

The web app is **read-only against silver and gold**. It does NOT call GitHub directly. All ingestion happens in the collector. This separation matters: the web app can be deployed publicly without holding any GitHub credentials.

### `packages/contracts`

The ts-rest contract definitions. Every API the web app exposes is defined here, with:

- HTTP method, path, request/response Zod schemas.
- Inferred TS types exported for client + server use.

The collector re-uses the **request body schemas** for validating inbound API responses (it does not expose HTTP endpoints itself).

```ts
// example
export const metricsContract = c.router({
  getOverview: {
    method: 'GET',
    path: '/api/metrics/overview',
    query: z.object({ orgId: z.string(), from: z.string(), to: z.string() }),
    responses: { 200: OverviewResponseSchema },
  },
  // ... ~20 endpoints
});
```

### `packages/db`

Drizzle schema definitions, migration runner, and a connection-pool client. Re-export everything; the collector and web app import directly:

```ts
import { db, fact_org_daily } from '@ghcp-dash/db';
```

### `packages/value`

Pure functions implementing the formulas from spec 02. No I/O. Inputs are typed silver-shaped objects; outputs are typed gold-shaped objects. Ships its own test suite.

## 4. Contract-driven development pattern

The flow for adding a new endpoint:

1. **Define the contract** in `packages/contracts`. This forces you to think about request, response, and error shapes before writing code.
2. **Implement the server** in `apps/web/app/api/...`. ts-rest validates the request and infers handler signatures from the contract.
3. **Use the client** anywhere in `apps/web` (server components, client components) — the client is type-safe and auto-completes off the contract.

No hand-written fetch URLs in the UI. No untyped request bodies. Schema drift between client and server is impossible by construction.

Contracts MUST preserve unknown nullable dates from the database as `null` instead of inventing generic fallback dates. UI surfaces render those fields as an explicit unknown state (`—`) unless the relevant spec allows a source-specific explanatory date.

Settings endpoints are deployment-level controls, not metrics reads: `GET /api/settings` and `PUT /api/settings/knobs` operate on the canonical settings row and MUST NOT require org/date query parameters. The web client still calls them through the ts-rest contract.

## 5. Auth model (v1)

Two distinct auth concerns:

### Outbound (collector → GitHub)

- One classic PAT per deployment, in env var `GITHUB_TOKEN`.
- Validated on collector startup (scope check via `/user`).
- Phase 2: GitHub App.

### Inbound (browser → web app)

- `AUTH_MODE` controls inbound dashboard access:
  - unset resolves to `shared-password` when `DASHBOARD_PASSWORD` is set, otherwise `open` for backward compatibility.
  - `open` leaves dashboard pages and application API routes unguarded by app middleware; dashboard pages MUST show an auth-disabled warning banner and Settings mutations MUST be rejected because no app identity exists.
  - `shared-password` uses `DASHBOARD_PASSWORD` to create a signed single-session cookie that protects dashboard pages and application API routes, except auth endpoints and `/api/health`.
  - `identity-header` trusts only the configured `AUTH_IDENTITY_HEADER` (default `x-ms-client-principal-name`) from an upstream identity-aware ingress/proxy. Operators MUST ensure that upstream authenticates users, strips spoofed client-supplied identity headers, and injects the trusted header before traffic reaches the app. If `DASHBOARD_PASSWORD` is also set, shared-password login remains available as a fallback.
- Shared-password sessions use `httpOnly`, `sameSite=lax`, `secure` in production, `path=/`, and a 12-hour max age. Changing `DASHBOARD_PASSWORD` invalidates existing sessions.
- Settings/admin mutations MUST require authenticated `shared-password` or `identity-header` access. Native role-aware admin is not implemented; deployments that require viewer/admin separation MUST enforce it upstream for `/settings` and `/api/settings/*`.
- P1 production-like deployments SHOULD use identity-aware ingress/OIDC, such as Microsoft Entra ID or another OIDC-compatible gateway/proxy, as the primary access control until native dashboard OAuth/RBAC is implemented.
- Native dashboard OAuth/RBAC remains future work; the current code does not implement GitHub OAuth, per-user roles, or full RBAC.

The landing page, getting-started/onboarding guide, cost-savings calculator page, login page, auth endpoints, and `/api/health` are **always public** in protected modes. These public pages MUST NOT expose dashboard facts, secrets, or outbound GitHub credentials. The shared password remains a beta fallback, not production RBAC.

## 6. Deployment topology

### Local development

```
docker-compose up
  ├── postgres:16    (port 5432, volume-backed)
  └── adminer        (port 8080, optional)

pnpm dev             # runs collector --once and web in parallel
```

The documented local path is command-by-command: `pnpm install`, `pnpm infra:up`, `pnpm db:migrate`, then either `pnpm db:seed:demo` for demo data or `pnpm collect` / `pnpm collect:backfill` for configured real data, followed by `pnpm web`. This is the "15 minutes to value" path from spec 00; stale `pnpm bootstrap` examples MUST NOT be used unless such a script is reintroduced.

### Production — Azure (target)

```
                  ┌─────────────────────────┐
                  │  Azure Container Apps   │
  ┌─────────┐     │  ┌───────────────────┐  │
  │ User    │────▶│  │ web (always-on)   │  │     ┌──────────────────┐
  │ browser │     │  └───────────────────┘  │     │ Azure Postgres   │
  └─────────┘     │  ┌───────────────────┐  │────▶│ Flexible Server  │
                  │  │ collector (job,   │  │     └──────────────────┘
  ┌──────────┐    │  │  scheduled daily) │  │              ▲
  │ GitHub   │◀───│  └───────────────────┘  │              │
  │ APIs     │    └─────────────────────────┘              │
  └──────────┘                                             │
                  Manual migration/bootstrap job ──────────┤
                                                            │
  Phase 2: ┌─────────────────────────┐                     │
           │ Microsoft Fabric         │  ◀ silver mirror ◀──┘
           │ (OneLake bronze/silver/  │
           │  gold + Power BI)        │
           └─────────────────────────┘
```

Bicep templates live under `infra/bicep/`. The minimal single-region P1 foundation provisions:

- Azure Container Registry for versioned web/collector images.
- Azure Container Apps environment (Consumption workload profile) connected to Log Analytics.
- One Container App for `web` (HTTP ingress, min replicas 1 by default, `/api/health` probes).
- One manual Container Apps Job for migration/bootstrap execution. It MUST use the `migration-database-url` secret and run Drizzle migrations followed by the production-safe seed before web traffic or scheduled collection is enabled.
- One Container Apps Job for `collector` (cron schedule, daily 04:00 UTC by default, `--concurrency 1`).
- Azure Database for PostgreSQL Flexible Server and the application database.
- Azure Key Vault for runtime secrets (`github-token`, dashboard password, and database URL secrets).
- Separate user-assigned managed identities for web, migration/bootstrap, and collector secret/registry access.
- Azure Storage with an Azure Files share mounted as durable collector `BRONZE_DIR` and a Blob container for future exports.

The foundation intentionally leaves some P1 hardening unfinished: private networking, automated database role bootstrap, validated tagged-release deployment orchestration, alert rules/action groups, custom domains, and native OIDC/RBAC auth remain follow-on work before production self-host readiness can be claimed. Phase 2 adds OneLake/Fabric workspace provisioning and a "mirror" container app that streams silver inserts to delta tables.

## 7. Configuration

All config is via environment variables, defined and documented in `.env.example`. The web app and collector load config through a single Zod-validated config module in `packages/contracts/src/config.ts`. Invalid config exits with a clear error on startup, never at request time.

Settings that change frequently (value-translation knobs, blend weights, currency) live in the `settings` Postgres table under the canonical `value_translation_knobs` key, **not** environment variables. Env vars hold initial defaults that get written into `settings` during seed/bootstrap. Gold recomputation after knob changes remains collector-owned so the web app does not become the write-side process for derived facts.

## 8. Observability

- **Structured logs** — both apps emit JSON to stdout (one log-line per request, plus collector progress lines). Pino in production, pretty-printed in dev.
- **Health endpoints** — `/api/health` (web) and `--check` flag (collector) for liveness/readiness probes. The web health contract MUST keep DB readiness as the HTTP status gate and expose additive nullable freshness fields (`lastSuccessfulIngestionCompletedAt`, `lastSuccessfulIngestionTargetDay`, `staleDataStatus`, `staleDataWarning`, `staleAfterHours`) so stale ingestion is observable without treating stale data as a process liveness failure.
- **Metrics** — Prom-style `/api/metrics` endpoint in Phase 2; v1 ships without external metrics export.
- **Audit trail** — every `ingestion_run` row IS the audit trail. The Settings page in Phase 1 will surface the last 30 ingestion runs as a status table.

## 9. Performance budgets

- First contentful paint on the dashboard's Overview page: **≤ 1.5s** on a cold cache.
- Any single API call from a chart: **≤ 500ms** at p95 against 1 year of data for a 5,000-seat org.
- Daily collector run (incremental, single org): **≤ 60s**.
- Backfill of 1 year for a single org: **≤ 30 min**.

Hitting these requires:

- Pre-aggregated `fact_org_daily` and a covering index on `(org_id, day)`.
- Server components for non-interactive panels (no client-side fetch waterfall).
- Recharts in client components only where interaction is needed.

## 10. Testing strategy

| Layer                | Tooling          | What we test                                                                  |
| -------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `packages/value`     | Vitest unit      | Every formula from spec 02. Property tests for monotonicity, bounds.          |
| `packages/contracts` | Vitest unit      | Zod schemas accept canonical examples and reject malformed payloads.          |
| `apps/collector`     | Vitest + nock    | Against recorded GitHub API fixtures; assert idempotent upserts.              |
| `apps/web` API       | Vitest + msw     | Hit ts-rest handlers directly with fake DB; verify response shapes.           |
| `apps/web` UI        | Playwright (P1)  | Smoke test: each view renders without errors against seeded DB.               |

CI runs typecheck, lint, test, build, migration smoke, collector configuration smoke, demo seed smoke, and Docker image build smoke on every PR. The Node matrix uses Node 20 and Node 22; Docker image smoke builds the web and collector images locally without pushing them.

## 11. Security posture

- `GITHUB_TOKEN` is read once at collector startup, never logged, never sent to the browser.
- The web app has zero outbound GitHub calls.
- The Postgres connection from the web app uses a separate role with `SELECT` only on silver/gold and `INSERT/UPDATE` only on `settings`.
- Secrets in Azure deploy via Key Vault references; never baked into images.
- Dependabot enabled on the repo; weekly cadence.
- Container images run as non-root (UID 1000).

## Open questions

- **Multi-org deploys**: v1 supports a comma-separated `GITHUB_ORGS` list, but the UI assumes one org context. Should v1 ship with an org switcher in the topnav, or defer that to P1?
- **Job orchestration in Azure**: Container Apps Jobs vs. a dedicated Logic App for the cron — Jobs is simpler, Logic Apps is more visible to non-engineers. Leaning Jobs for v1.
- **Image build strategy**: single Docker image for the whole monorepo with `CMD` switched at runtime, vs. one image per app. Multi-image is cleaner for layer caching; single is simpler. Leaning multi.
