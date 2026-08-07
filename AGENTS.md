# AGENTS.md

> Instructions for AI coding agents (Copilot CLI, Codex CLI, Cursor, Claude Code, Continue, etc.). Follow the [open agents.md standard](https://agents.md).

You are working in **GitHub Copilot Metrics Dashboard** — an OSS dashboard + ingestion tool that translates GitHub Copilot usage data into a defensible **value story** (time saved, dollars saved, ROI). Customers self-host; primary deploy target is Azure, with production self-host readiness gated by spec 08.

## Read this before changing things

1. **[`specs/CONSTITUTION.md`](./specs/CONSTITUTION.md)** — 10 non-negotiable principles. If a spec or this file conflicts with the constitution, the constitution wins.
2. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — 5-minute system orientation: components, data flow, named patterns (Medallion, Hexagonal, CQRS, Contract-First, Kimball, Modulith).
3. **[`specs/`](./specs/README.md)** — nine detailed design docs (product, data, value, architecture, UI, roadmap, delivery/quality, unit economics, launch readiness/priorities). The "what" and "how" of the product.
4. **[`specs/08-launch-readiness-and-priorities.md`](./specs/08-launch-readiness-and-priorities.md)** — canonical P0/P1/P2 readiness gates. Do not claim production self-host readiness until P1 passes.
5. **This file** — operational quick-reference. Commands, layout, conventions, gotchas.

If you are making a material change to user-visible behavior, the data model, the value-translation methodology, or the deployment topology, **update `specs/` and `ARCHITECTURE.md` in the same PR** (Constitution Principle 8).

## Tech stack at a glance

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS v3 + shadcn/ui
- **Charts**: Recharts + [EvilCharts](https://evilcharts.com) (shadcn-style registry; new views use it, older views use our wrappers — see `apps/web/src/components/charts/`)
- **API**: ts-rest contracts (single source of truth for HTTP surface)
- **Backend runtime**: Node 20+ (ESM only)
- **DB**: Postgres 16 + Drizzle ORM
- **Validation**: Zod (used by ts-rest)
- **Tests**: Vitest
- **Package manager**: pnpm 10 workspaces

## Quick commands

```bash
# Bootstrap (first run)
pnpm install
docker compose -f infra/docker-compose.yml up -d postgres
pnpm db:migrate

# Easiest demo path — no GitHub creds needed
pnpm db:seed:demo                 # 90 days of synthetic data for "demo-org"
pnpm --filter @ghcp-dash/web start
# → open http://localhost:3000

# Real-data path
# Set GITHUB_TOKEN + GITHUB_ORGS in .env, then:
pnpm collect

# Daily commands
pnpm -r typecheck                 # ALWAYS run before claiming work is done
pnpm -r lint                      # ESLint on apps/web; echo-ok on packages
pnpm -r test                      # 52 tests across 5 packages
pnpm -r build                     # tsc for packages, next build for web

# Database helpers
pnpm db:seed                      # dims + settings only (production-safe)
pnpm db:seed:clear-demo           # remove only demo data
pnpm db:seed:reset                # wipe ALL facts (requires --yes)
pnpm db:studio                    # Drizzle Studio at https://local.drizzle.studio

# Infra
pnpm infra:up                     # docker compose up -d
pnpm infra:down                   # docker compose down

# Azure deploy (azd)
azd up                            # provision + deploy web/collector to Azure Container Apps
azd provision                     # infra only; postprovision hook bootstraps DB roles + runs migrations
azd deploy                        # build/push images + update the running apps
```

## Layout

```
apps/
  web/           Next.js 15 dashboard. Server components by default.
    src/components/charts/evil/  EvilCharts components for newer chart UI.
  collector/    Node CLI: collect | backfill | seed | gold | export-parquet
packages/
  contracts/   ts-rest + Zod schemas (shared client/server/collector)
  db/          Drizzle schema + migrations + seed (Drizzle-based)
  value/       Pure value-translation engine (3 estimators + ROI + blend)
infra/
  docker-compose.yml, bicep/, docker/
specs/
  CONSTITUTION.md, README.md, 00–08-*.md
.github/
  copilot-instructions.md         Brief pointer to this file + constitution
  instructions/*.instructions.md   Path-scoped overlays (applyTo: glob)
```

## Conventions

- **ESM only** everywhere. `"type": "module"` in every `package.json`. Use `.js` extensions in TS source imports (TypeScript needs this for ESM resolution).
- **Strict TypeScript** per `tsconfig.base.json` — no `any` unless absolutely necessary; prefer `unknown` + type narrowing.
- **Pure functions in `packages/value`** — no I/O, no `Date.now`, no random.
- **Drizzle, not raw SQL** — even for seed data. The one exception is the initial migration SQL emitted by `drizzle-kit generate`.
- **ts-rest, not hand-written fetch** — all web API consumption goes through the contract in `packages/contracts`.
- **shadcn primitives** live in `apps/web/src/components/ui/` (copied source, not an NPM dep).
- **Design system**: the visual language follows [`DESIGN.md`](./DESIGN.md) — the GitHub brand (neutral-anchored, GitHub Green hero, **Copilot Purple = Copilot-attributed data**, self-hosted **Mona Sans** / Mona Sans Mono, dark-mode first-class). Use `globals.css` tokens — no ad-hoc hex. Material design-system changes update `DESIGN.md` (Constitution Principle 11).
- **Recharts in client components only** (`'use client'`). Server components for non-interactive panels.
- **New chart UI uses EvilCharts** components from `src/components/charts/evil/`. Existing chart wrappers (`stacked-area.tsx`, `line-chart.tsx`, etc.) stay for now; replace only when there's a clear visual gain.
- **All currency** via `Intl.NumberFormat` with the configured currency code.
- **All dates** as `YYYY-MM-DD` strings in the API; localized only in the UI.
- **Tests adjacent to source** under `src/__tests__/` per package.

## Workflow expectations

- Always run `pnpm -r typecheck` and `pnpm -r test` before claiming work is complete.
- For DB changes, also run `pnpm db:migrate` against a fresh Postgres and verify no FK errors.
- For collector changes, also run `pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check` to validate config wiring.
- Update `specs/` for material changes (Constitution Principle 8).
- Update tests for any behavioral change.

## Known gotchas

- **Collector concurrency** is safe above 1: dimension upserts are serialized by a Postgres transaction-scoped advisory lock (`pg_advisory_xact_lock`, see `DIMENSION_ADVISORY_LOCK_KEY` in `apps/collector/src/silver/common.ts`) plus an in-process gate, so concurrent scope ingestion no longer deadlocks on dim upserts. The default is `--concurrency 4`; drop to `--concurrency 1` only for troubleshooting or a constrained DB pool. Regression coverage: `apps/collector/src/__tests__/dimension-concurrency.test.ts` (requires `DATABASE_URL`).
- **Postgres pool keepalive** can keep Node's event loop alive after CLI work finishes. The collector explicitly calls `process.exit()` at the end of `apps/collector/src/index.ts` — preserve this.
- **`.env` discovery** walks up the directory tree from cwd. Works when invoked from any sub-package via `pnpm --filter`.
- **pkg-db initial migration** was hand-written (drizzle-kit wasn't available during build). Re-running `pnpm db:generate` will regenerate it — diff carefully before committing.
- **Default knob blend is `delivery=1.0`**. Orgs with zero Copilot-authored PRs will show $0 saved on the headline. Users tune in Settings.
- **`'default'` is not a real org slug.** Default org resolution lives in `apps/web/src/lib/resolve-org.ts` — prefers `demo-org`, falls back to most-recently-active org. Never hardcode `'default'`.
- **Schema relaxations vs spec example**: GitHub API responses are looser than the docs' example. `totals_by_cli` is a single object (not an array), `last_known_*_version` are objects (not strings), 1-day endpoints return a flat object (not wrapped in `day_totals`), billing `date` is ISO timestamp. The schemas use `.passthrough()` and `.optional()` widely — keep that posture.
- **GitHub Enterprise scope** is preview/advanced, not part of the P0 org-scope readiness claim unless release notes explicitly promote it. It requires a classic PAT with `read:enterprise` or `manage_billing:copilot`; the `gh` CLI's `gho_` token won't work for enterprise endpoints.

## When in doubt

1. Re-read `specs/CONSTITUTION.md` — the relevant principle usually clarifies the call.
2. Re-read the relevant `specs/0N-*.md`.
3. Check `.github/instructions/*.instructions.md` for path-scoped rules that may apply.
4. If still unclear, ask the user — don't guess at user-visible behavior or methodology.
