# 01 — Data Sources & Model

This spec defines every external data source the product consumes, the auth posture for each, and the database schema we land data into.

## 1. Sources at a glance

| Source                               | Phase | Endpoint family                                                              | Used for                                                         |
| ------------------------------------ | :---: | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Copilot Metrics API — org daily      | v1    | `/orgs/{org}/copilot/metrics/reports/organization-1-day`                     | Daily org aggregates, with full backfill                         |
| Copilot Metrics API — org 28-day     | v1    | `/orgs/{org}/copilot/metrics/reports/organization-28-day/latest`             | Initial seed + daily reconcile                                   |
| Copilot Metrics API — users daily    | v1    | `/orgs/{org}/copilot/metrics/reports/users-1-day`                            | Per-user activity, used for team aggregations                    |
| Copilot Metrics API — user-teams     | v1    | `/orgs/{org}/copilot/metrics/reports/user-teams-1-day`                       | Team membership, joined client-side with users-daily             |
| Billing Usage API — org summary      | v1    | `/organizations/{org}/settings/billing/usage`                                | Aggregated billed amounts by product (Copilot seats etc.)        |
| AI Credits Usage API                 | v1    | `/organizations/{org}/settings/billing/usage/ai-credits` (or successor)      | Premium-request spend, model breakdown, included pool consumption|
| GH Issues / PRs (REST + GraphQL)     | P1    | `/repos/{owner}/{repo}/issues`, GraphQL search/issue                         | Issue throughput, copilot-user overlay                           |
| Enterprise scope endpoints           | P2 gate / preview config | `/enterprises/{ent}/copilot/metrics/...`                                     | Enterprise rollups when explicitly validated; not part of the P0 org-scope readiness claim |
| AzDO / Jira / Linear                 | P2    | Vendor-specific                                                              | Cross-tracker ticket throughput                                  |

## 2. Authentication

### v1: Classic PAT

The collector uses **one** GitHub classic personal access token (`GITHUB_TOKEN` env var). Required scopes:

- `read:org` — for the Metrics API at organization scope.
- `manage_billing:copilot` — for the Billing Usage and AI Credits endpoints. **Required:** these endpoints do not accept fine-grained PATs.

The token MUST be issued by an organization owner or a billing manager. The collector validates scopes on startup and exits with a clear error message if any are missing.

Enterprise-scope endpoint variants MAY be configured for preview validation with `GITHUB_ENTERPRISE` and a classic PAT that has `read:enterprise` or `manage_billing:copilot`, plus billing access where billing or AI-credit facts are ingested. This preview configuration MUST NOT be described as P0 readiness, enterprise-scale source auth, or cost-center support until spec 08 promotes the corresponding gates and the README/release notes identify the supported scope.

### Phase 2: GitHub App

Production deployments will move to a GitHub App for:

- Per-org installation (no shared user PAT).
- Higher rate limits (5,000 → 15,000 req/hr per installation).
- Fine-grained permission scoping.
- Audit-friendly token rotation.

The collector layer MUST abstract auth behind a `GitHubAuth` interface so swapping PAT → App is a single-file change.

## 3. Endpoint behaviors & gotchas

### 3.1 Metrics endpoints return signed download URLs, not inline JSON

All `*/copilot/metrics/reports/*` endpoints return:

```json
{
  "download_links": ["https://..."],
  "report_day": "2026-06-18"
}
```

The collector MUST follow each `download_link` to fetch the actual NDJSON payload. Links are time-limited; we do NOT persist them. We DO persist the raw NDJSON files into bronze storage (default: `./data/bronze/{source}/{org}/{date}.ndjson`) for replay and audit.

### 3.2 Reports start 2025-10-10

Daily reports are available **starting 2025-10-10** with up to **1 year** of history. The collector's backfill MUST clamp `--from` to `MAX(2025-10-10, today − 365d)` and emit a warning if the user requests an earlier date.

### 3.3 28-day report vs daily reports

- The `*/reports/*-28-day/latest` endpoints return a single rolling 28-day aggregate. We use this on first install for an instant "fill the dashboard" experience while the daily backfill runs in the background.
- The `*/reports/*-1-day?day=YYYY-MM-DD` endpoints are the source of truth for historical data. They MUST be called once per day per scope.

### 3.4 Rate limits & retries

GitHub REST is rate-limited to 5,000 req/hr per token (PAT) or 15,000 req/hr per installation (App). Even worst-case backfill (365 days × ~4 endpoints = ~1,500 calls per org) fits comfortably.

The collector MUST:

- Honor `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers; sleep until reset when remaining ≤ 50.
- Retry transient errors (5xx, timeout, 429) with exponential backoff: 1s, 2s, 4s, 8s, 16s — max 5 attempts.
- Persist a per-day idempotent checkpoint so a crashed run resumes without redownloading completed days.

### 3.5 Empty days and 204 responses

The org daily endpoint returns `204 No Content` when no Copilot activity occurred. The collector MUST treat 204 as "successfully zero" — write a zero-row marker, do not retry, do not error.

### 3.6 Teams smaller than 5 are omitted

The `user-teams-1-day` endpoint omits teams with fewer than 5 seated Copilot users. The Team Scorecards view (Phase 1) MUST show an explicit "Suppressed (privacy threshold)" tile rather than silently dropping these teams.

## 4. Data flow

```
GitHub APIs                                      Bronze (raw)              Silver (normalized)            Gold (computed)
                                                 ──────────────            ────────────────────           ──────────────────
  org-1-day  ───┐                                                          fact_org_daily                 fact_value_daily
  users-1-day ──┼──▶ collector ─▶ ./data/bronze/  ─▶  parser ─▶ Postgres   fact_user_daily          ─▶    fact_team_value_daily
  user-teams ───┤                  *.ndjson                                fact_pr_daily                  fact_roi_daily
  billing/usage ┤                                                          dim_user
  ai-credits ───┘                                                          dim_team
                                                                           bridge_user_team
                                                                           fact_billing_daily
                                                                           fact_ai_credits_daily
```

The bronze NDJSON is retained on disk by default (configurable retention, default 90 days). Silver tables are the query surface for the dashboard. Gold tables are derived nightly from silver + the value-translation knobs (see spec 02). When knobs change in the UI, recomputation MUST be collector-owned or explicitly queued; if no job runner is configured, the UI/API MUST disclose that gold values update after the next collector gold rebuild rather than implying immediate recomputation.

## 5. Database schema (silver layer)

The schema is designed to map directly onto a Fabric/OneLake delta-table layout in Phase 2. Surrogate keys are stable across re-ingestion. All timestamps are `timestamptz` in UTC. Day grain columns are `date`.

### 5.1 Dimensions

```
dim_org
  org_id              text          PK   -- GitHub org slug, lowercased
  display_name        text
  first_seen_day      date
  last_seen_day       date

dim_user
  user_id             bigint        PK   -- GitHub numeric user id
  user_login          text          INDEX
  pseudonym           text          INDEX -- stable hash for privacy-safe display
  first_seen_day      date
  last_seen_day       date

dim_team
  team_id             bigint        PK
  org_id              text          FK → dim_org
  slug                text
  first_seen_day      date
  last_seen_day       date
  UNIQUE (org_id, slug)

dim_feature       -- enum-ish: code_completion | chat | agent | cli | review | edit | plan | ask
dim_ide           -- vscode | jetbrains | xcode | visual_studio | neovim | unknown
dim_language      -- typescript | python | go | unknown | ...
dim_model         -- gpt-4o | claude-3.5-sonnet | gpt-4.1 | unknown | ...
```

### 5.2 Org-scope facts

```
fact_org_daily                              -- one row per (org, day)
  org_id              text          FK
  day                 date
  daily_active_users  int
  weekly_active_users int
  monthly_active_users int
  monthly_active_chat_users int
  monthly_active_agent_users int
  daily_active_cli_users int
  code_acceptance_activity_count int
  code_generation_activity_count int
  loc_added_sum             bigint
  loc_deleted_sum           bigint
  loc_suggested_to_add_sum  bigint
  loc_suggested_to_delete_sum bigint
  user_initiated_interaction_count int
  -- PR fields (this is the value-story gold)
  pr_total_created                  int
  pr_total_created_by_copilot       int
  pr_total_merged                   int
  pr_total_merged_created_by_copilot int
  pr_total_reviewed                  int
  pr_total_reviewed_by_copilot       int
  pr_total_suggestions               int
  pr_total_applied_suggestions       int
  pr_total_copilot_suggestions       int
  pr_total_copilot_applied_suggestions int
  pr_median_minutes_to_merge                          numeric
  pr_median_minutes_to_merge_copilot_authored         numeric
  pr_median_minutes_to_merge_copilot_reviewed         numeric
  -- CLI token usage (note: CLI-only in current API)
  cli_prompt_count          int
  cli_request_count         int
  cli_session_count         int
  cli_prompt_tokens_sum     bigint
  cli_output_tokens_sum     bigint
  ingested_at         timestamptz
  PRIMARY KEY (org_id, day)

fact_org_daily_by_feature                   -- (org, day, feature)
  org_id, day, feature, code_acceptance_activity_count, code_generation_activity_count,
  loc_added_sum, loc_deleted_sum, loc_suggested_to_add_sum, loc_suggested_to_delete_sum,
  user_initiated_interaction_count
  PRIMARY KEY (org_id, day, feature)

fact_org_daily_by_ide                       -- (org, day, ide)
  ... same shape, indexed by ide

fact_org_daily_by_language_feature          -- (org, day, language, feature)
fact_org_daily_by_language_model            -- (org, day, language, model)
fact_org_daily_by_model_feature             -- (org, day, model, feature)
```

### 5.3 User-scope facts

```
fact_user_daily                             -- one row per (user, day)
  user_id, org_id, day,
  used_chat boolean, used_agent boolean, used_cli boolean,
  code_acceptance_activity_count, code_generation_activity_count,
  loc_added_sum, loc_deleted_sum, loc_suggested_to_add_sum, loc_suggested_to_delete_sum,
  user_initiated_interaction_count,
  cli_prompt_count, cli_request_count, cli_session_count,
  cli_prompt_tokens_sum, cli_output_tokens_sum,
  ingested_at,
  PRIMARY KEY (user_id, org_id, day)

fact_user_daily_by_feature                  -- (user, day, feature)
fact_user_daily_by_ide                      -- (user, day, ide)
fact_user_daily_by_language_feature         -- (user, day, language, feature)
fact_user_daily_by_language_model           -- (user, day, language, model)
fact_user_daily_by_model_feature            -- (user, day, model, feature)

bridge_user_team                            -- many-to-many (user, team) with day grain
  user_id, team_id, org_id, day,
  PRIMARY KEY (user_id, team_id, day)
```

The user model breakdown tables are additive silver facts derived from the existing `users-1-day` payload fields `totals_by_language_model` and `totals_by_model_feature`. They support cohort/team model-mix analysis without changing the value methodology or exposing selected-user drilldowns. Consumption cost attribution normalizes model names across usage and AI-credit billing sources before joining because GitHub usage payloads can include variant/effort suffixes that are absent from billing facts.

Team-level metrics are computed by joining `bridge_user_team` with `fact_user_daily` on `(user_id, day)` and aggregating to `team_id`. There is no pre-materialized team table at silver — only at gold.

### 5.4 Cost facts

```
fact_billing_daily                          -- one row per (org, day, product, sku)
  org_id, day, product, sku,
  quantity numeric, unit text, gross_amount numeric, net_amount numeric, currency text,
  PRIMARY KEY (org_id, day, product, sku)

fact_ai_credits_daily                       -- one row per (org, day, model, feature)
  org_id, day, model, feature,
  included_quantity numeric, billed_quantity numeric, billed_amount numeric, currency text,
  PRIMARY KEY (org_id, day, model, feature)
```

`fact_ai_credits_daily` is available only when the configured token has access to Copilot AI-credit billing data. Views that depend on this table MUST distinguish unavailable billing facts from zero spend and MUST NOT render missing AI-credit data as `0%` premium usage, `$0` model spend, or a cost-center overage recommendation.

The Billing API response shape is product-flexible (Copilot Business seats, Copilot Enterprise seats, Actions, Storage, etc.); we land all of it but the dashboard only surfaces Copilot-related products by default.

### 5.5 Operational tables

```
ingestion_run                               -- one row per collector invocation
  run_id              uuid          PK
  source              text                 -- 'org_daily' | 'users_daily' | 'user_teams' | 'billing' | 'ai_credits'
  org_id              text
  target_day          date
  started_at          timestamptz
  completed_at        timestamptz
  status              text                 -- 'success' | 'failed' | 'no_content' | 'partial'
  rows_written        int
  bronze_path         text                 -- absolute path of the NDJSON file we landed
  error_message       text                 -- nullable
  attempts            int

settings                                    -- key/value, single-tenant
  key text PK, value jsonb, updated_at timestamptz
  -- holds value-translation knobs (see spec 02), feature flags, last seen schema version
```

### 5.6 Gold layer (computed)

Gold tables are derivative — they are **dropped and rebuilt** by the collector when value-translation knobs change or when silver facts are replayed. They MUST be safe to delete and recompute at any time. The UI/API MUST disclose whether a knob change started, queued, or merely requires the next collector gold rebuild.

```
fact_value_daily                            -- one row per (org, day, estimator)
  org_id, day, estimator,                   -- 'activity' | 'output' | 'delivery'
  hours_saved numeric,
  dollars_saved numeric,
  knob_snapshot jsonb,                      -- copy of inputs used to compute this row
  PRIMARY KEY (org_id, day, estimator)

fact_roi_daily                              -- one row per (org, day)
  org_id, day,
  hours_saved_blended numeric,              -- weighted avg of the 3 estimators (default = delivery only)
  dollars_saved_blended numeric,
  total_spend numeric,                      -- seats + premium + ai credits
  net_value numeric, roi_ratio numeric,
  PRIMARY KEY (org_id, day)

fact_team_value_daily                       -- one row per (team, day, estimator)
  team_id, org_id, day, estimator,
  hours_saved, dollars_saved,
  PRIMARY KEY (team_id, day, estimator)
```

## 6. Mapping from API response to silver tables

For the org-daily endpoint, the inbound NDJSON shape is:

```jsonc
{
  "day_totals": [{ "day": "2025-10-01", "code_acceptance_activity_count": 2, ... }],
  "enterprise_id": "1",                // ignored at org scope
  "report_start_day": "2025-09-04",
  "report_end_day": "2025-10-01",
  "etl_id": "green",
  ...
}
```

Each `day_totals[i]` becomes one row of `fact_org_daily`. Nested arrays (`totals_by_feature`, `totals_by_ide`, etc.) explode into the corresponding `fact_org_daily_by_*` tables. The collector MUST upsert (`ON CONFLICT (org_id, day) DO UPDATE`) so re-running for the same day is idempotent.

For users-daily, each top-level array element becomes one row of `fact_user_daily` plus N rows in the per-feature/per-ide/per-language children. Same upsert behavior.

## 7. Phase 2 — lakehouse mapping

When we add the OneLake/Fabric writer, the silver tables map 1:1 onto delta tables in a Lakehouse, with the same column names and types. The bronze NDJSON files become the bronze delta-table replay log. Gold tables become Fabric SQL views over silver + the knob `settings` row.

This is why the silver schema has `org_id` as a `text` natural key (matches Fabric partitioning convention) and uses `bigint` for IDs (matches Fabric SQL types).

## Open questions

- **Retention of bronze NDJSON**: 90 days default is conservative. Larger orgs may want indefinite retention for audit. Make it configurable per source.
- **Pseudonymization salt**: where is the salt stored? Today: `settings` table. Consider per-deployment salt rotation policy.
- **Billing API endpoint for Copilot premium requests**: the exact path is in flux as GitHub rolls out metered billing. Spec uses placeholder `/settings/billing/usage`; collector MUST treat any 404 here as "feature not available for this org" rather than fatal.
- **Schema migration policy**: Drizzle migrations are append-only; column drops are rare and require a major version bump.
