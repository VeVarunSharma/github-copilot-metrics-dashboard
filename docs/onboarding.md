# GitHub account onboarding

Use this guide when you want to test Copilot Metrics Dashboard with a real GitHub organization before doing a larger rollout. The safest path is: prove the dashboard with demo data, validate a temporary GitHub token without writing data, ingest a small date range, then expand to the reporting window you need.

## Recommended flow

### 1. Prove the app locally with no GitHub credentials

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm smoke:demo
pnpm web
```

Open `http://localhost:3000` and confirm the demo dashboard loads. This validates the local app, database, migrations, seed data, and P0 views without touching GitHub.

### 2. Create a temporary classic PAT

For a real account test, ask the GitHub organization owner, billing manager, or approved Copilot admin to create a short-lived **classic** PAT. Fine-grained PATs are not supported by the billing endpoints.

| Data you want | Required token scope | Notes |
| --- | --- | --- |
| Copilot metrics for an org | `read:org` | Required for the P0 Metrics API path. |
| Seat, premium-request, and AI-credit spend | `manage_billing:copilot` | Recommended for the complete Cost & Spend and ROI story. Missing this scope makes billing/AI-credit ingestion partial or unavailable. |
| Delivery preview sources | `repo` or `public_repo` | Only needed when `GITHUB_INGEST_DELIVERY=true` or `--with-delivery` is used. |
| Enterprise preview | `read:enterprise` or `manage_billing:copilot` | Preview/advanced path; P0 readiness is org-scope unless release notes say otherwise. |

Keep the token collector-side only. Do not paste it in issues, chat, screenshots, or the web app. Revoke it after the evaluation if it was created only for testing.

### 3. Configure `.env`

For the normal org-scope onboarding path:

```dotenv
GITHUB_TOKEN=ghp_your_temporary_classic_pat
GITHUB_ORGS=your-org-slug
GITHUB_ENTERPRISE=
GITHUB_INGEST_DELIVERY=false
```

For GitHub Enterprise Server, also set:

```dotenv
GITHUB_API_BASE_URL=https://github.example.com/api/v3
```

Do not put `GITHUB_TOKEN` in the web app deployment environment. The collector is the only component that should hold outbound GitHub credentials.

### 4. Validate configuration before ingestion

First validate local environment wiring without calling GitHub:

```bash
pnpm smoke:collector-config
```

Then validate database connectivity and token scopes without writing ingestion facts:

```bash
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check
```

Expected outcome: the command logs `collector check passed`. If `manage_billing:copilot` is missing, the check warns that billing and AI-credit endpoints will be skipped. That is acceptable for usage-only testing, but Cost & Spend and ROI will be incomplete.

### 5. Ingest a small real-data window

Start with a narrow range so token, org access, rate limits, and dashboard population are easy to inspect:

```bash
pnpm collect:backfill --from <yyyy-mm-dd> --to <yyyy-mm-dd> --concurrency 1
```

Use completed UTC days. The collector is idempotent, so rerunning the same range is safe. Keep `--concurrency 1` during evaluation because concurrent dimension upserts are a known deadlock risk.

After the backfill:

```bash
pnpm web
```

Open `http://localhost:3000/overview`, select the org in the org switcher, and review Settings -> Ingestion status.

### 6. Expand to the reporting window

Once the small-window test works, backfill the window you need:

```bash
pnpm collect:backfill --from <yyyy-mm-dd> --to <yyyy-mm-dd> --concurrency 1
```

GitHub Copilot Metrics API history is limited by GitHub availability and the project clamps requests to the supported window. Daily collection can then run with:

```bash
pnpm collect --concurrency 1
```

## What the onboarding UI should communicate

A good first-run experience should guide an operator through these stages:

1. **Choose a mode:** demo data, org-scope real data, or enterprise preview.
2. **Explain the credential boundary:** token goes only to the collector, never to the web app or browser.
3. **Show exact required scopes:** `read:org` for metrics, `manage_billing:copilot` for spend, optional `repo` or `public_repo` for delivery preview.
4. **Run preflight checks:** config check first, then token/database check.
5. **Run a short backfill:** prove a few completed UTC days before doing 28/90/365 days.
6. **Verify inside the app:** org switcher shows the org, Overview has data, Settings lists recent ingestion runs, Cost & Spend explains any missing billing data.
7. **Tune value assumptions:** Settings exposes methodology knobs; after saving knob changes, run `pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold` or wait for the next collector gold rebuild.
8. **Schedule and secure:** move the token to a secret store, set dashboard access controls, and schedule daily collection.

## How to use the app after data loads

| Surface | Use it for |
| --- | --- |
| Overview | Executive value story: dollars saved, hours saved, ROI, spend-vs-value, and supporting adoption/PR evidence. |
| Adoption | Active-user, engagement, acceptance-rate, IDE, model, and funnel health. |
| Code Generation | Generated output by language, feature, IDE, chat mode, and model. Treat LoC as directional, not the value claim by itself. |
| Pull Requests | Copilot-authored, merged, reviewed, and time-to-merge evidence. This is the default delivery-based headline signal. |
| Cost & Spend | Seat cost, premium requests, AI credits, and unit economics. Missing billing scopes can make some values unavailable. |
| Calculator | Standalone what-if estimate that works without GitHub credentials or database data. |
| Settings | Value knobs, blend weights, privacy posture, and recent ingestion status. |

## Common onboarding outcomes

| Symptom | Meaning | Next step |
| --- | --- | --- |
| `GITHUB_TOKEN is missing required scopes` | The token cannot access metrics for the configured scope. | Add `read:org` for org scope, or the enterprise preview scope required for enterprise mode. |
| Billing scope warning | Usage ingestion can proceed, but spend and ROI may be incomplete. | Add `manage_billing:copilot` if the evaluation needs Cost & Spend. |
| `204 No Content` ingestion rows | GitHub returned no data for that org/day/source. | Confirm Copilot is enabled and try a wider completed date range. |
| Dashboard shows no orgs | The DB has no demo or real org rows. | Run `pnpm db:seed:demo` or a real backfill, then refresh. |
| Cost values render `-` | Denominator or billing data is unavailable. | Confirm billing scope and date range; this is safer than showing misleading zeroes. |

## Cleanup after a test

If the test used a temporary token, revoke it in GitHub. To remove only demo data, run `pnpm db:seed:clear-demo`. To wipe all fact data in a local throwaway environment only, run `pnpm db:seed:reset`; do not run reset commands against real customer data.
