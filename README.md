# Copilot Metrics Dashboard

> An OSS GitHub Copilot metrics dashboard + ingestion tool that tells the **value story**: time saved, dollars saved, spend, ROI, adoption, and delivery evidence.

[![Status: P0 OSS Beta](https://img.shields.io/badge/status-P0%20OSS%20Beta-blue)](./specs/08-launch-readiness-and-priorities.md)
[![CI: P0 gated](https://img.shields.io/badge/CI-typecheck%20%7C%20lint%20%7C%20test%20%7C%20build%20%7C%20smoke-blue)](./.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

GitHub's native Copilot dashboard shows a 28-day window of usage metrics. Copilot Metrics Dashboard lets you self-host a longer-running reporting system:

1. **Long-horizon ingestion** of GitHub Copilot Metrics API data, with backfill support.
2. **Value translation** from usage to time saved and dollars saved using transparent, tunable assumptions.
3. **Cost-aware ROI** across seats, premium requests, and AI-credit spend.
4. **Delivery evidence** from PR metrics already exposed by the Copilot Metrics API.
5. **Standalone calculator** for quick what-if savings estimates without GitHub API access.

## Verified Azure POC

A public, open-access proof of concept is deployed in the `ghcpdash-cu1` environment in Azure Central US:

- [Dashboard](https://ghcpdash-ghcpdash-cu1-web.happysand-14c29e7d.centralus.azurecontainerapps.io/)
- [Health endpoint](https://ghcpdash-ghcpdash-cu1-web.happysand-14c29e7d.centralus.azurecontainerapps.io/api/health)
- [Azure resource group: `rg-ghcpdash-cu1`](https://portal.azure.com/#@/resource/subscriptions/ad92e163-a85e-40cc-bb50-054b0b8197a8/resourceGroups/rg-ghcpdash-cu1/overview)

Deployment-time verification on 2026-08-07 confirmed the Azure POC path. This is **not** a production-readiness or uptime claim. The dashboard intentionally has no access gate, and the Azure Portal link requires access to the subscription.

## Status: P0 OSS Beta

This repository is in **P0 — OSS Beta / core value-story launch** for a trustworthy local/demo and org-scope real-data experience across the P0 views. See [`CHANGELOG.md`](./CHANGELOG.md) for beta release notes. Do **not** treat the project as production self-host ready until the **P1** gates in [`specs/08-launch-readiness-and-priorities.md`](./specs/08-launch-readiness-and-priorities.md) pass, including production-credible auth, Azure deployment artifacts, observability, backup/restore, and runbooks.

| Capability | Readiness |
| --- | --- |
| Demo seed, Postgres storage, collector, and value engine | P0 core |
| Overview, Cost & Spend, Adoption, Code Generation, Pull Requests, Calculator, Settings | P0 first-class views when populated and explained |
| Delivery Velocity and Engineering Health | P1 preview/advanced only; not P0 launch blockers |
| Enterprise-scale rollups/cost centers, Tickets/GitHub Issues, Teams, GitHub App source auth, AzDO/Jira/Linear, Fabric/OneLake, Power BI, GHAS/Security, forecasting/anomaly detection | P2 expansion; hidden/planned until readiness gates pass |

Beta limits to keep in mind:

- Shared-password dashboard auth is a **beta fallback**, not RBAC, OAuth, or a production access model.
- Preview/advanced views may exist for exploration, but only the P0 views above define OSS beta readiness.
- P1 production self-host guidance is intentionally gated on hardened auth, health/observability, backup/restore, and runbooks.
- Deferred P2/polish items in spec 08 include DORA/CI gold completion, p90 lead-time/commit stats, richer agent-session source signals, screenshots/demo GIFs, issue-template config polish, Teams/Tickets, external trackers, Fabric/OneLake, GHAS/Security, and forecasting/anomaly detection.

### P1 production self-host readiness materials

Use this index when evaluating the production self-host path. These are P1 hardening artifacts, not a claim that P1 gates have passed; [`specs/08-launch-readiness-and-priorities.md`](./specs/08-launch-readiness-and-priorities.md) remains the readiness authority.

| Material | Use it for | Current caveat |
| --- | --- | --- |
| [`docs/auth.md`](./docs/auth.md) | Dashboard access posture, Microsoft Entra built-in auth setup, the exposure-based "do you need auth?" guide, and secret rotation. | Native in-app OAuth/RBAC is not built; Entra EasyAuth (identity-header) is the recommended production path and shared-password is a fallback. |
| [`docs/observability.md`](./docs/observability.md) | `/api/health`, collector run status, the provisioned Azure Monitor alert catalog, and Log Analytics queries. | Alerts and the availability test are provisioned behind `enableAlerts` / `enableAvailabilityTest`; tune thresholds and receivers per environment. |
| [`docs/production-runbook.md`](./docs/production-runbook.md) | `azd` deployment, upgrades, daily collection, backfill, backup/restore, and incident response. | A clean tagged-release deployment and a completed restore rehearsal remain P1 validation gates. |
| [`docs/restore-rehearsal.md`](./docs/restore-rehearsal.md) | Step-by-step Postgres PITR + bronze replay/backfill drill (scripts in `scripts/restore/`) plus a non-production evidence template. | A completed, reviewed rehearsal record is still required before checking off P1 restore readiness. |
| [`infra/bicep/README.md`](./infra/bicep/README.md) | Azure Bicep foundation (Container Apps, Postgres, Key Vault, Log Analytics, bronze storage, Entra auth, alerts) deployable via `azd`. | Single-region; DB role bootstrap is automated by the `azd` postprovision hook, but private networking and a validated tagged rollout remain hardening work. |

## Screenshots

Screenshots are generated from the demo dataset. See [`docs/images/README.md`](./docs/images/README.md)
for the one-command capture procedure. Once generated, they render here:

<!-- Uncomment after running the capture procedure in docs/images/README.md
![Overview](./docs/images/overview.png)
![Cost & Spend](./docs/images/cost.png)
![Adoption](./docs/images/adoption.png)
-->

## Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  collector       │───▶│   Postgres       │───▶│   web (Next.js)  │
│  (Node CLI)      │    │   lakehouse-     │    │   shadcn + ts-   │
│                  │    │   shaped facts   │    │   rest contracts │
│  • Metrics API   │    │   + dimensions   │    │                  │
│  • Billing API   │    │                  │    │   P0 views       │
│  • AI Credits    │    │                  │    │   + calculator   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

Built as a [pnpm](https://pnpm.io) monorepo:

- **`apps/web`** — Next.js 15 dashboard and calculator.
- **`apps/collector`** — Node CLI for daily ingestion, backfill, seeding, gold rebuilds, and Parquet export.
- **`packages/contracts`** — ts-rest API contracts shared by web and collector code.
- **`packages/db`** — Drizzle ORM schema, migrations, and seed scripts.
- **`packages/value`** — pure value-translation engine for hours, dollars, ROI, and estimator blending.

## Quick start

### Demo mode — no GitHub credentials

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm smoke:demo                  # migrate + seed + verify 90 days of synthetic "demo-org" data
pnpm web
# Open http://localhost:3000
```

This is the fastest path: it populates the P0 value story without calling GitHub.

### Safe real-account onboarding

Use [`docs/onboarding.md`](./docs/onboarding.md) or the in-app `/getting-started` page when testing with someone's GitHub organization. The recommended flow is:

1. Prove the app locally with demo data.
2. Create a short-lived classic PAT for an approved org owner, billing manager, or Copilot admin.
3. Validate `.env` with `pnpm smoke:collector-config`.
4. Validate DB connectivity and token scopes with `pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check`.
5. Backfill a small completed UTC date range with `pnpm collect:backfill --from <yyyy-mm-dd> --to <yyyy-mm-dd> --concurrency 1`, then expand once the dashboard looks right.

The GitHub token belongs only in the collector environment. The web app must not receive outbound GitHub credentials.

### Real-data mode

Set `GITHUB_TOKEN` and `GITHUB_ORGS` in `.env`, then run:

```bash
pnpm db:migrate                  # creates/updates Postgres tables
pnpm db:seed                     # production-safe dims + settings, including pseudonym_salt
pnpm smoke:collector-config      # validates required env without calling GitHub
pnpm collect                     # pulls the supported baseline window
pnpm web
```

`GITHUB_ENTERPRISE` exists for preview validation of enterprise endpoint variants with a classic PAT, but the P0 beta readiness claim is org-scope unless the release notes explicitly say otherwise.

To backfill historical data:

```bash
pnpm collect:backfill --from 2025-10-10 --to 2026-06-19
```

## Optional dashboard auth

`AUTH_MODE` controls inbound dashboard access:

- unset: backward-compatible default — `shared-password` when `DASHBOARD_PASSWORD` is set, otherwise `open`.
- `open`: no dashboard auth; pages show an auth-disabled banner and Settings mutations are rejected.
- `shared-password`: beta fallback using `DASHBOARD_PASSWORD` and a signed, `httpOnly`, `sameSite=lax` cookie (`secure` in production) with a 12-hour max age.
- `identity-header`: production-credible app mode for Azure Easy Auth / Entra ID / identity-aware proxies. The app trusts only the configured upstream header (`AUTH_IDENTITY_HEADER`, default `x-ms-client-principal-name`) and does not validate OAuth tokens itself.

`/getting-started`, `/calculator`, `/login`, `/api/auth/login`, `/api/auth/logout`, and `/api/health` stay public in protected modes. Shared-password auth remains a beta safeguard, not production RBAC/OAuth. In identity-header mode, upstream must authenticate users, strip spoofed client headers, inject the trusted identity header, and enforce any viewer/admin separation for Settings until native dashboard RBAC exists. See [`docs/auth.md`](./docs/auth.md).

## P0 validation and health

| Command | What it checks |
| --- | --- |
| `pnpm smoke:migrate` | Applies migrations against the configured Postgres database. |
| `pnpm smoke:demo` | Runs migrations, seeds `demo-org`, and verifies demo data covers P0 views. |
| `pnpm smoke:collector-config` | Validates collector env (`GITHUB_TOKEN` plus `GITHUB_ORGS`, or preview `GITHUB_ENTERPRISE`) without calling GitHub. |
| `pnpm smoke:p0` | Runs collector config smoke plus demo smoke. |
| `pnpm ci:p0` | Local CI parity: typecheck, lint, test, build, and P0 smoke. |

`pnpm smoke:p0` and `pnpm ci:p0` need collector config values. For config-only smoke without real GitHub credentials, use placeholders:

```bash
GITHUB_TOKEN=ci-placeholder-token GITHUB_ORGS=demo-org pnpm smoke:p0
```

The web app exposes a public health endpoint for local checks and future P1 probes:

```bash
curl http://localhost:3000/api/health
```

For health probe behavior, collector run status, alert recommendations, and example Log Analytics queries, see [`docs/observability.md`](./docs/observability.md).

## Azure P1 foundation

A single-region Bicep foundation lives in [`infra/bicep`](./infra/bicep/). The verified clean-environment flow validates with `azd provision --preview --no-prompt`, provisions with `azd provision --no-prompt`, then deploys with `azd deploy --no-prompt` so Container Apps and ACR RBAC can propagate before image builds and pushes. It provisions Container Apps web/collector workloads, Postgres Flex, Key Vault, Log Analytics, managed identities, durable bronze storage, optional Microsoft Entra built-in auth (`enableEntraAuth`), and optional Azure Monitor alerts (`enableAlerts`) plus an `/api/health` availability test (`enableAvailabilityTest`). An `azd` postprovision hook bootstraps least-privilege database roles, runs migrations, and verifies grants. It is a P1 hardening artifact, not a production-readiness claim; review [`infra/bicep/README.md`](./infra/bicep/README.md) and [`docs/production-runbook.md`](./docs/production-runbook.md) before deploying.

## Seed reference

The Drizzle seed script is idempotent for dimensions and safe for real-data databases by default. It never touches fact data unless explicitly asked.

| Command | What it does |
| --- | --- |
| `pnpm db:seed` | Dimensions + default settings. |
| `pnpm db:seed:demo` | Dimensions/settings + 90 days of synthetic `demo-org` data. |
| `pnpm db:seed:clear-demo` | Removes only demo data. Real orgs are untouched. |
| `pnpm db:seed:reset` | **Dangerous:** wipes all fact tables and ingestion runs. Keeps dimensions/settings. |

## Value translation methodology

Every dollar figure is computed from explicit, configurable knobs. The Settings page lets admins tune them, and derived metrics link to "How is this calculated?" explanations.

Three estimators run side-by-side:

1. **Activity-based** — accepted completions, chat, and agent-session activity.
2. **Output-based** — Copilot-attributed output as a directional sanity check.
3. **Delivery-based** — Copilot-authored and Copilot-reviewed PR evidence from the Metrics API.

Dollar conversion = `time_saved_hours × avg_loaded_eng_cost_per_hour`.

ROI = `(dollars_saved − seat_cost − premium_spend − ai_credit_spend) ÷ total_spend`.

Future issue/ticket, team, tracker, Fabric/OneLake, GHAS/Security, and forecasting/anomaly work is P2 unless promoted by the launch-readiness spec.

## Why "lakehouse-shaped" Postgres?

P0 uses Postgres for a fast, self-hostable dashboard. The schema is intentionally fact/dimension shaped across bronze → silver → gold layers so a later P2 Fabric/OneLake writer can mirror the model without rewriting the core value engine.

## Community, support, and security

- Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request; PRs use the [pull request template](./.github/PULL_REQUEST_TEMPLATE.md).
- Use the issue templates for [bug reports](./.github/ISSUE_TEMPLATE/bug_report.yml), [feature requests](./.github/ISSUE_TEMPLATE/feature_request.yml), and [documentation gaps](./.github/ISSUE_TEMPLATE/documentation.yml).
- See [`SUPPORT.md`](./SUPPORT.md) for how to get help and the project's support boundaries.
- Follow the [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
- Report vulnerabilities through the private path described in [`SECURITY.md`](./SECURITY.md); do not publish exploit details or sensitive data in public issues. Dependencies are watched by Dependabot + CI `pnpm audit`, and code is scanned by CodeQL; before making the repo public, run the [`docs/security-prerelease-checklist.md`](./docs/security-prerelease-checklist.md).

## License

MIT
