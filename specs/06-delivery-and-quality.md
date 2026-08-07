# 06 — Delivery & Quality

This spec adds delivery velocity, engineering-health, and lightweight forecasting/anomaly metrics to **GitHub Copilot Metrics Dashboard**. It extends the medallion data model from [`./01-data-sources-and-model.md`](./01-data-sources-and-model.md), follows the defensible-math and privacy rules in [`./CONSTITUTION.md`](./CONSTITUTION.md), and adds V9/V10 views using the conventions in [`./04-ui-and-views.md`](./04-ui-and-views.md).

> **Readiness note:** This spec describes planned delivery-quality design. Launch visibility is governed by [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md): DORA/CI gold completion, p90 lead-time or PR-cycle stats, commit stats, and forecasting/anomaly outputs MUST NOT become P0 beta or P1 production-readiness blockers unless spec 08 explicitly promotes them.

## Goals (MUSTs)

- The product MUST compute the four DORA metrics at org grain and repo drilldown grain: Deployment Frequency, Lead Time for Changes, Change Failure Rate, and MTTR.
- The product MUST compute delivery context metrics: commit velocity, time-to-release-feature, PR cycle-time p50/p90, and branch age.
- The product MUST compute engineering-health metrics: CI/CD success rate, time-to-green, flaky-test/re-run rate, PR rework rate, review depth, and Phase 2 dependency freshness.
- The product MUST compute lightweight forecast/anomaly metrics: monthly spend forecast, adoption-stall alerts, spend anomaly alerts, and acceptance-rate drop alerts.
- Every displayed metric MUST have a precise formula and a `howCalculated` payload in the API response, consistent with Constitution P1.
- Delivery and quality metrics MUST NOT claim causation by Copilot unless the source API explicitly supplies Copilot-attributed counts. Commit and release metrics are operational context only.
- New silver and gold tables MUST remain lakehouse-shaped and idempotently upsertable, consistent with [`./01-data-sources-and-model.md`](./01-data-sources-and-model.md) §5 and Constitution P4/P5.

## Non-goals (v1 of this spec)

- We do NOT implement ML forecasting. Forecasting is a linear projection unless this spec is amended.
- We do NOT infer whether Copilot wrote, broke, fixed, or reviewed a specific commit.
- We do NOT store individual commit SHAs in silver or gold tables.
- We do NOT add per-developer delivery panels, leaderboards, or rankings.
- We do NOT replace the existing value estimators from [`./02-value-translation.md`](./02-value-translation.md). DORA and health metrics are context for delivery quality, not a fourth dollars-saved estimator in v1.
- We do NOT ingest third-party CI systems in v1. GitHub Actions is the only CI/CD source in this spec.

## Data sources

| Source | Endpoint | Auth scope | Used for |
| --- | --- | --- | --- |
| GH Releases API | `GET /repos/{owner}/{repo}/releases` | `repo` or `public_repo` | Deployment frequency, release date, release tag, release author class, commit-to-deploy joins |
| GH Actions workflow runs | `GET /repos/{owner}/{repo}/actions/runs` | `repo` or `public_repo` | CI/CD success rate, time-to-green, re-run rate, deploy workflow detection, failure breakdown |
| GH Commits API | `GET /repos/{owner}/{repo}/commits` | `repo` or `public_repo` | Aggregated per-author per-day commit velocity, commit-to-release lead-time inputs, branch age context |
| GH Pulls API | `GET /repos/{owner}/{repo}/pulls` and `GET /repos/{owner}/{repo}/pulls/{pull_number}` | `repo` or `public_repo` | PR cycle time, branch age, commits-after-first-review, merged/revert/hotfix PR detection |
| GH Pulls reviews API | `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews` | `repo` or `public_repo` | First-review timestamp, review-depth counts, approval/change-request distribution |
| GH Pulls review comments API | `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments` | `repo` or `public_repo` | Review depth, suggestion comments, suggestions applied where detectable |
| GH Issues API | `GET /repos/{owner}/{repo}/issues` | `repo` or `public_repo` | MTTR for labels `incident` and `bug:critical`, time-to-release-feature from issue close to deploy |
| Dependabot alerts API | `GET /repos/{owner}/{repo}/dependabot/alerts` | `repo` or `public_repo` plus Dependabot alert access | Phase 2 dependency freshness: open alert count and age |

The collector MUST persist raw API responses to bronze storage before parsing, using the same retention and replay posture as [`./01-data-sources-and-model.md`](./01-data-sources-and-model.md) §3.1. For REST endpoints that return JSON arrays instead of NDJSON download links, the collector MUST write one JSON object per line into `./data/bronze/{source}/{org_id}/{YYYY-MM-DD}.ndjson`.

## Metric definitions

| Metric | Definition | Grain | Notes |
| --- | --- | --- | --- |
| Deployment Frequency | `COUNT(releases) / daysInWindow` | org, repo, day | Releases come from GH Releases API; pre-releases MAY be excluded by setting. |
| Lead Time for Changes | Median minutes from commit author timestamp to first release `published_at` containing that commit. | org, repo, day | Only commits associated with a release in the window are included. |
| Change Failure Rate | `failed_release_count / release_count`, where failed releases are followed by a hotfix or revert PR merged within 48 hours. | org, repo, day | Hotfix/revert detection MUST use labels and title patterns, recorded in `howCalculated`. |
| MTTR | Median minutes from issue `created_at` to `closed_at` for issues labelled `incident` or `bug:critical`. | org, repo, day | Open incidents are excluded from the median and counted separately. |
| Commit velocity | Sum of commits per day from `fact_commit_daily`. | org, team, repo, day | Aggregated per-author per-day in silver; UI shows only org/team totals. |
| Time-to-release-feature | Median minutes from issue close time to next release `published_at` for linked issue/PR. | org, repo, day | Requires issue/PR linkage; unmatched issues are excluded and counted. |
| PR cycle time p50/p90 | p50 and p90 minutes from PR `created_at` to `merged_at`. | org, repo, day | Closed-unmerged PRs are excluded. |
| Branch age | Median days from PR head branch first observed commit to PR merge or current day. | org, repo, day | Used as context; not a value claim. |
| CI/CD success rate | `successful_completed_runs / completed_runs`. | org, repo, workflow, day | Cancelled/skipped runs are excluded unless setting includes them. |
| Time-to-green | Median seconds from push/head commit timestamp to first successful CI run for the same commit. | org, repo, day | Runs without a matching push/commit timestamp are excluded. |
| Flaky test rate | `rerun_success_after_failure_count / rerun_candidate_count`. | org, repo, day | GitHub Actions re-run rate is the v1 proxy for flaky tests. |
| PR rework rate | Median commits pushed after first review per merged PR. | org, repo, day | First review includes comments, changes requested, or approval. |
| Review depth | Comments per PR and review records per PR. | org, repo, day | Suggestions applied is best-effort from review comments. |
| Dependency freshness | Open Dependabot alert count and median open age in days. | org, repo, day | Phase 2. |
| Monthly spend forecast | `monthToDateSpend + avgDailySpendLast28d * remainingDaysInMonth`. | org, day | Uses billing facts from [`./01-data-sources-and-model.md`](./01-data-sources-and-model.md). |
| Adoption-stall alert | Fires when `current7dDAU < previous7dDAU * (1 - threshold_pct)`. | org, day | Default threshold SHOULD be 20%, configurable in settings. |
| Spend anomaly alert | Fires when `dailySpend > meanTrailing28d + 2 * stddevTrailing28d`. | org, day | Requires at least 14 prior daily observations. |
| Acceptance-rate drop alert | Fires when current 7-day acceptance rate drops more than threshold_pct from prior 7-day rate. | org, day | Default threshold SHOULD be 15%, configurable in settings. |

## Silver tables

### `fact_release_daily`

Intent: one row per repo per release day, normalized from GH Releases and enriched with release classification used by DORA.

| Column | Type | Description |
| --- | --- | --- |
| `org_id` | `text` | GitHub org slug, lowercased. |
| `repo_id` | `bigint` | FK to `dim_repo`. |
| `day` | `date` | Release `published_at` day in UTC. |
| `release_id` | `bigint` | GitHub release id. |
| `tag_name` | `text` | Release tag. |
| `published_at` | `timestamptz` | Release publish timestamp. |
| `target_commit_day` | `date` | Day of the target commit, if known. |
| `is_prerelease` | `boolean` | Mirrors GH release flag. |
| `is_draft` | `boolean` | Mirrors GH release flag; drafts MUST NOT count as deployments. |
| `is_hotfix` | `boolean` | True when release or linked PR matches configured hotfix patterns. |
| `is_revert` | `boolean` | True when release or linked PR matches configured revert patterns. |
| `commit_count` | `int` | Count of commits associated with the release, when resolvable. |
| `median_commit_to_release_min` | `numeric` | Median minutes from included commits to release publish. |
| `ingested_at` | `timestamptz` | Collector timestamp. |

Primary key: `(org_id, repo_id, release_id)`. Indexes: `(org_id, day)`, `(repo_id, day)`, `(org_id, repo_id, published_at)`. Silver upserts MUST use `ON CONFLICT (org_id, repo_id, release_id) DO UPDATE`.

### `fact_workflow_run_daily`

Intent: one row per repo/workflow/day with completed GitHub Actions run counts and timing aggregates.

| Column | Type | Description |
| --- | --- | --- |
| `org_id` | `text` | GitHub org slug. |
| `repo_id` | `bigint` | FK to `dim_repo`. |
| `workflow_id` | `bigint` | GitHub workflow id. |
| `workflow_name` | `text` | Latest workflow name observed. |
| `day` | `date` | Run `created_at` day in UTC. |
| `completed_runs` | `int` | Runs with terminal conclusion. |
| `successful_runs` | `int` | Completed runs with conclusion `success`. |
| `failed_runs` | `int` | Completed runs with conclusion `failure` or `timed_out`. |
| `cancelled_runs` | `int` | Completed runs with conclusion `cancelled`. |
| `rerun_count` | `int` | Runs where `run_attempt > 1`. |
| `rerun_success_after_failure_count` | `int` | Re-runs that succeeded after a failed prior attempt. |
| `median_duration_sec` | `numeric` | Median `updated_at - run_started_at`. |
| `median_time_to_green_sec` | `numeric` | Median push/head timestamp to first successful run. |
| `deploy_run_count` | `int` | Runs classified as deployment workflows. |
| `ingested_at` | `timestamptz` | Collector timestamp. |

Primary key: `(org_id, repo_id, workflow_id, day)`. Indexes: `(org_id, day)`, `(repo_id, day)`, `(workflow_id, day)`. The collector MUST store workflow-run details only as daily aggregates in silver.

### `fact_commit_daily`

Intent: privacy-preserving commit activity table for delivery context and lead-time joins. This table is aggregated per author per day and MUST NEVER persist individual commit SHAs.

| Column | Type | Description |
| --- | --- | --- |
| `org_id` | `text` | GitHub org slug. |
| `repo_id` | `bigint` | FK to `dim_repo`. |
| `author_id` | `bigint` | GitHub numeric user id when available; nullable for unmapped authors. |
| `author_pseudonym` | `text` | Stable hash generated with `pseudonym_salt`. |
| `day` | `date` | Commit author day in UTC. |
| `commit_count` | `int` | Number of commits authored by this pseudonymous author on this repo/day. |
| `first_commit_at` | `timestamptz` | First commit timestamp for the aggregate bucket. |
| `last_commit_at` | `timestamptz` | Last commit timestamp for the aggregate bucket. |
| `default_branch_commit_count` | `int` | Count observed on default branch. |
| `ingested_at` | `timestamptz` | Collector timestamp. |

Primary key: `(org_id, repo_id, author_pseudonym, day)`. Indexes: `(org_id, day)`, `(repo_id, day)`, `(author_pseudonym, day)`. Individual commit SHAs MUST remain only in bronze retention and MUST NOT be copied to silver, gold, API responses, logs, or UI state.

### `dim_repo`

Intent: stable repository dimension for all delivery and quality facts.

| Column | Type | Description |
| --- | --- | --- |
| `repo_id` | `bigint` | GitHub repository id, PK. |
| `org_id` | `text` | GitHub org slug. |
| `owner` | `text` | Repository owner login. |
| `name` | `text` | Repository name. |
| `full_name` | `text` | `owner/name`. |
| `visibility` | `text` | `public`, `private`, or `internal`. |
| `default_branch` | `text` | Current default branch. |
| `archived` | `boolean` | True if archived. |
| `first_seen_day` | `date` | First collector observation. |
| `last_seen_day` | `date` | Latest collector observation. |

Primary key: `(repo_id)`. Unique index: `(org_id, full_name)`. Repo records MAY be updated when metadata changes, but `repo_id` MUST remain the stable surrogate key.

## Gold tables

### `fact_dora_daily`

Intent: daily DORA and delivery-context metrics, recomputable from silver tables.

| Column | Type | Description |
| --- | --- | --- |
| `org_id` | `text` | GitHub org slug. |
| `day` | `date` | Metric day. |
| `deployment_frequency` | `numeric` | Releases per day in the selected calculation window. |
| `lead_time_min` | `numeric` | Median commit-to-deploy minutes. |
| `change_failure_rate` | `numeric` | Failed releases ÷ releases. |
| `mttr_min` | `numeric` | Median incident/critical-bug time-to-close in minutes. |
| `commit_velocity` | `int` | Commits per day at org grain. |
| `time_to_release_feature_min` | `numeric` | Median issue-close-to-release minutes. |
| `pr_cycle_time_p50_min` | `numeric` | p50 PR created-to-merged minutes. |
| `pr_cycle_time_p90_min` | `numeric` | p90 PR created-to-merged minutes. |
| `median_branch_age_days` | `numeric` | Median branch age in days. |
| `sample_size` | `jsonb` | Counts used for each median/rate. |
| `how_calculated` | `jsonb` | Formula, filters, settings, and source tables. |
| `computed_at` | `timestamptz` | Gold rebuild timestamp. |

Primary key: `(org_id, day)`. Index: `(org_id, day DESC)`. Gold rows MUST be safe to delete and recompute.

### `fact_ci_daily`

Intent: daily engineering-health metrics derived from workflow runs, PR review data, and Phase 2 dependency alerts.

| Column | Type | Description |
| --- | --- | --- |
| `org_id` | `text` | GitHub org slug. |
| `day` | `date` | Metric day. |
| `ci_success_rate` | `numeric` | Successful completed runs ÷ completed runs. |
| `median_time_to_green_sec` | `numeric` | Median seconds from push to passing CI. |
| `flaky_test_rate` | `numeric` | Re-run success after failure ÷ re-run candidates. |
| `pr_rework_rate` | `numeric` | Median commits after first review per merged PR. |
| `review_comments_per_pr` | `numeric` | Mean review comments per PR. |
| `reviews_per_pr` | `numeric` | Mean review records per PR. |
| `suggestions_applied_rate` | `numeric` | Applied suggestions ÷ suggestions detected, nullable when not detectable. |
| `dependabot_open_alert_count` | `int` | Phase 2 open Dependabot alerts. |
| `dependabot_median_age_days` | `numeric` | Phase 2 median open alert age. |
| `failure_breakdown` | `jsonb` | Counts by workflow conclusion/category. |
| `how_calculated` | `jsonb` | Formula, filters, settings, and source tables. |
| `computed_at` | `timestamptz` | Gold rebuild timestamp. |

Primary key: `(org_id, day)`. Index: `(org_id, day DESC)`. `dependabot_*` columns MAY remain null until Phase 2 source ingestion is enabled.

## Forecasting and anomaly outputs

Forecasting and anomaly outputs SHOULD be exposed from `/api/metrics/delivery/summary` and MAY be materialized into a future `fact_delivery_alert_daily` table if alert history becomes product-facing.

| Output | Formula | Default threshold | `howCalculated` requirements |
| --- | --- | --- | --- |
| Monthly spend forecast | `monthToDateSpend + avg(dailySpend over trailing 28d) * remainingDaysInMonth` | N/A | Include spend source tables and trailing-day count. |
| Adoption-stall alert | `current7dDAU < previous7dDAU * (1 - threshold)` | `20%` | Include both 7-day windows and threshold. |
| Spend anomaly alert | `dailySpend > trailing28dMean + 2 * trailing28dStddev` | `2σ` | Include mean, stddev, observed spend, minimum sample rule. |
| Acceptance-rate drop alert | `current7dAcceptanceRate < previous7dAcceptanceRate * (1 - threshold)` | `15%` | Include numerator/denominator for both windows. |

Thresholds MUST live in `settings` as explicit knobs. The UI MUST show current knob values in the alert explanation panel, matching the knob transparency approach in [`./02-value-translation.md`](./02-value-translation.md).

## Value-engine modules

### `dora.ts` (pure functions)

```ts
export function deploymentFrequency(
  releases: ReleaseDailyInput[],
  daysInWindow: number,
): number;

export function leadTimeForChanges(
  commits: CommitDailyInput[],
  releases: ReleaseDailyInput[],
): number | null;

export function changeFailureRate(
  releases: ReleaseDailyInput[],
  revertPrs: PullRequestInput[],
): number | null;

export function meanTimeToRestore(
  incidents: IncidentIssueInput[],
): number | null;
```

Rules:

- Functions MUST be pure: no I/O, no database calls, no `Date.now()`, no mutation of inputs.
- Functions MUST return `null` when the denominator or median sample is empty.
- `leadTimeForChanges` MUST operate on aggregated commit inputs and release commit-count/timing aggregates; it MUST NOT require commit SHAs from silver.
- `changeFailureRate` MUST accept the hotfix/revert window as a configurable option in implementation, defaulting to 48 hours.

### `ci.ts`

```ts
export function ciSuccessRate(runs: WorkflowRunDailyInput[]): number | null;

export function medianTimeToGreen(runs: WorkflowRunDailyInput[]): number | null;

export function flakyTestRate(runs: WorkflowRunDailyInput[]): number | null;
```

Rules:

- `ciSuccessRate` MUST use completed runs as the denominator and MUST document whether cancelled runs are included.
- `medianTimeToGreen` MUST ignore runs that cannot be linked to a push/head timestamp.
- `flakyTestRate` MUST be labelled as a re-run proxy in the UI because v1 does not ingest test-case-level results.

## API contracts

All web endpoints MUST be defined in `packages/contracts` as ts-rest contracts, consistent with Constitution P7.

| Endpoint | Purpose | Required response shape |
| --- | --- | --- |
| `GET /api/metrics/delivery/summary` | Overview mini-row and alert summary | KPI values, forecast values, alert states, `howCalculated` per metric |
| `GET /api/metrics/delivery/dora` | V9 DORA chart data | Daily DORA series, context series, repo drilldown rows, `howCalculated` |
| `GET /api/metrics/delivery/ci` | V10 engineering-health chart data | Daily CI series, failure breakdowns, PR review distributions, flaky-test proxy rows, `howCalculated` |

The web app MUST read these endpoints only through the generated contract client. The web app MUST NOT call GitHub directly.

## UI

### V9 — Delivery Velocity (new view)

**Audience.** Engineering leader, platform owner, CSA.

**Top question answered.** "Are we shipping faster and recovering safely?"

**Layout.**

```text
KPI row:  Deploy frequency · Lead time · CFR · MTTR · Commits/day
Primary:  EvilCharts LineChart with 4 DORA series over 90d
Below:    ChartGrid 2-cols
          · EvilCharts BarChart for releases/day
          · EvilCharts AreaChart for lead-time distribution
Bottom:   Drilldown table per repo
```

**Charts.**

| Element | Type | Source |
| --- | --- | --- |
| Deploy frequency | KPI tile | `fact_dora_daily.deployment_frequency` |
| Lead time | KPI tile | `fact_dora_daily.lead_time_min` |
| CFR | KPI tile | `fact_dora_daily.change_failure_rate` |
| MTTR | KPI tile | `fact_dora_daily.mttr_min` |
| Commits/day | KPI tile | `fact_dora_daily.commit_velocity` |
| DORA trend | EvilCharts LineChart | `fact_dora_daily` over selected range |
| Releases/day | EvilCharts BarChart | `fact_release_daily` grouped by day |
| Lead-time distribution | EvilCharts AreaChart | release lead-time buckets from gold/silver aggregates |
| Repo drilldown | Table | repo-grouped DORA rollups from silver/gold |

Each metric tile MUST wire `howCalculated` from the API response and open the standard explanation panel. The explanation panel MUST include formulas, denominators, sample sizes, hotfix/revert label patterns, and whether pre-releases are included.

### V10 — Engineering Health (new view)

**Audience.** Engineering leader, platform owner.

**Top question answered.** "Is the delivery system healthy enough to sustain velocity?"

**Layout.**

```text
KPI row:  CI success · Time-to-green · PR rework · Dependabot open · Test stability
Primary:  EvilCharts LineChart for CI success-rate over 90d
Below:    ChartGrid 2-cols
          · EvilCharts BarChart for failure breakdown
          · EvilCharts PieChart for top flaky tests / rerun proxy categories
          · EvilCharts BarChart for PR review-depth distribution
Bottom:   Repo/workflow drilldown table
```

**Charts.**

| Element | Type | Source |
| --- | --- | --- |
| CI success | KPI tile | `fact_ci_daily.ci_success_rate` |
| Time-to-green | KPI tile | `fact_ci_daily.median_time_to_green_sec` |
| PR rework | KPI tile | `fact_ci_daily.pr_rework_rate` |
| Dependabot open | KPI tile | `fact_ci_daily.dependabot_open_alert_count` (Phase 2) |
| Test stability | KPI tile | `1 - fact_ci_daily.flaky_test_rate` |
| CI success trend | EvilCharts LineChart | `fact_ci_daily` over 90d |
| Failure breakdown | EvilCharts BarChart | `fact_ci_daily.failure_breakdown` |
| Top flaky tests / rerun proxy | EvilCharts PieChart | workflow re-run aggregates; true test names Phase 2+ only |
| PR review-depth distribution | EvilCharts BarChart | PR review/comment aggregates |

The Test stability tile MUST be labelled "re-run proxy" until test-case-level data is ingested. Dependabot tiles MUST show a Phase 2 empty state when Dependabot alert ingestion is disabled.

### Overview row update

V1 Overview MUST add a four-tile "Delivery & Quality" mini-row below the existing adoption/value sub-row, pulling from `/api/metrics/delivery/summary`.

| Tile | Metric | Source |
| --- | --- | --- |
| Deploys/day | Deployment frequency | `fact_dora_daily.deployment_frequency` |
| Lead time | Median commit-to-deploy | `fact_dora_daily.lead_time_min` |
| CI success | CI/CD success rate | `fact_ci_daily.ci_success_rate` |
| Alerts | Count of active delivery/spend/adoption alerts | `/api/metrics/delivery/summary` |

Each mini-row tile MUST include `howCalculated`. Alert tiles MUST link to the relevant V2, V6, V9, or V10 chart depending on the alert type.

## Auth scope additions

This phase requires `repo` for private/internal repositories or `public_repo` for public-only organizations, in addition to `read:org` and `manage_billing:copilot`. The collector MUST validate required scopes on startup when any delivery-quality endpoint is enabled.

| Configuration | Required scopes | Startup behavior |
| --- | --- | --- |
| Copilot metrics only | `read:org`, `manage_billing:copilot` | Existing validation from [`./01-data-sources-and-model.md`](./01-data-sources-and-model.md). |
| Public repositories only | `read:org`, `manage_billing:copilot`, `public_repo` | Delivery-quality collector MAY run only for public repos. |
| Private/internal repositories | `read:org`, `manage_billing:copilot`, `repo` | Collector MUST fail fast with a clear missing-scope error if absent. |

The web app MUST NOT receive GitHub credentials and MUST NOT make outbound GitHub API calls, preserving the read/write separation described in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §3.3.

## Privacy posture

- `fact_commit_daily` aggregates per-author per-day. Individual commit SHAs NEVER persist in silver. This is required by Constitution P2.
- Commit velocity is shown at ORG and TEAM grain only. Repo drilldowns MAY show repo totals but MUST NOT expose per-developer rows.
- We DO NOT claim Copilot wrote any commit. Commit data is operational context only and MUST never be attributed to Copilot.
- Review-depth and PR rework views MUST avoid per-reviewer rankings.
- Bronze files contain raw GitHub API data and MUST follow the retention rules in [`./01-data-sources-and-model.md`](./01-data-sources-and-model.md). Bronze access MUST remain collector/operator-only.
- Any future test-case-level flaky-test ingestion MUST avoid exposing author/blame attribution in UI.

## Phasing

| Capability | Readiness | Rationale |
| --- | :---: | --- |
| GH Releases, Actions, aggregated Commits, Pulls/reviews ingestion | P1 preview / P2 gate | Extends outcomes data beyond the P0 value-story scope in [`./05-roadmap-and-phasing.md`](./05-roadmap-and-phasing.md) and MUST NOT block P0. |
| V9 Delivery Velocity | P1 preview / P2 gate | Requires release/commit/PR data and new auth scope. |
| V10 Engineering Health | P1 preview / P2 gate | Requires Actions and PR review data. |
| Overview Delivery & Quality mini-row | P2 deferred | Depends on a trusted gold DORA/CI summary endpoint and MUST NOT be a P0 proof point before spec 08 gates pass. |
| Dependabot freshness | P2 deferred | Requires Dependabot alert access and separate empty-state behavior. |
| Linear forecast/anomaly alerts | P2 deferred | Aligns with forecasting/anomaly detection gates in [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md). |
| ARIMA/Prophet forecasting | Not planned | Explicitly outside scope until evidence demands it. |

## Open questions

- Release detection: use GH Releases only, or detect from Actions deploy jobs?
- Incident label conventions: support multiple label patterns?
- CFR window: 48h hotfix window — make it configurable?
- Phase 2 forecasting: linear projection OK for v1; ARIMA/Prophet later?
