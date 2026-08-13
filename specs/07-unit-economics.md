# 07 — Unit Economics

Unit economics translate gross Copilot spend into per-unit cost answers that engineering and finance leaders can audit. Instead of asking only "what is our total bill?", customers can answer "what does each shipped thing cost us?" and track whether delivery efficiency is improving or degrading over time.

This spec extends the value and cost methodology in [`02-value-translation.md`](./02-value-translation.md), the UI patterns in [`04-ui-and-views.md`](./04-ui-and-views.md), and the phasing model in [`05-roadmap-and-phasing.md`](./05-roadmap-and-phasing.md). Normative language follows [`README.md`](./README.md) and RFC 2119.

## Goals (MUSTs)

- Surface 5-6 unit-cost metrics derivable from existing facts in v1; no new ingestion is required for the v1 set.
- Each unit-cost metric MUST have a clear numerator, denominator, date range, and silver-table lineage.
- Negative unit costs MUST be impossible by construction: use non-negative spend divided by non-negative units, never net value divided by units.
- `$ / active user` MUST exist now because V6 already defines it in [`04-ui-and-views.md`](./04-ui-and-views.md#v6--cost--spend).
- Every rendered unit-cost metric MUST include a `<HowCalculatedPanel>` with formula, numerator, denominator, date range, and source facts.

## Non-goals (v1 of this spec)

- No cost-per-feature until Releases ingestion exists; deferred from v1.
- No cost-per-issue until Issues ingestion exists; deferred from v1.
- No multi-currency conversion in v1; assume the configured currency.
- No per-developer unit economics, rankings, or surveillance affordances.
- No SKU-specific unit-cost model in v1; SKU breakdowns remain an open question.

## The unit-cost metrics

### Computable today (v1 data)

- **`$ / merged PR`** — `total_spend ÷ pr_total_merged`.
- **`$ / active user`** — `total_spend ÷ MAU`; already present in V6 headlines.
- **`$ / 1k LoC delivered`** — `total_spend × 1000 ÷ loc_added_sum`.
- **`$ / Copilot-authored PR`** — `total_spend ÷ pr_total_merged_created_by_copilot`.
- **`$ / active user trend`** — the same `$ / active user` formula evaluated as a daily 90-day series.

### Computable in Phase 1 (Releases ingestion)

- **`$ / released feature`** — `total_spend ÷ release_count`.

### Computable in Phase 2 (Issues ingestion)

- **`$ / closed issue`** — `total_spend ÷ issues_closed`.
- **`$ / bug closed`** — `total_spend ÷ bugs_closed`, filtered by configured bug labels.
- **`Cost of delay`** — `Σ(open_issue_age_days × dollars_per_dev_day)` for stalled issues.

## Shared definitions and guard rails

Let the configured date range be `[start_date, end_date]`, inclusive.

```text
total_spend =
  Σ fact_billing_daily.net_amount
+ Σ fact_ai_credits_daily.billed_amount
```

`total_spend` MUST be summed over the configured date range in the configured currency. `fact_billing_daily` supplies seat and premium-request spend; `fact_ai_credits_daily` supplies AI-credit spend, matching the ROI inputs in [`02-value-translation.md`](./02-value-translation.md#roi). `fact_org_daily` supplies v1 PR, MAU, and LoC denominators.

All spend inputs MUST be non-negative before unit-cost formulas run. If a billing correction creates a negative row, the aggregation layer MUST expose the correction separately and MUST NOT allow a negative unit-cost tile.

All denominators MUST guard against zero. If a denominator is `0` or unavailable, the metric MUST return `null`; the UI MAY render `—`, but MUST NOT render `$0` unless numerator is truly `0` and denominator is positive.

## Formulas

### `$ / merged PR`

```text
dollars_per_merged_pr =
  safe_divide(total_spend, Σ fact_org_daily.pr_total_merged)
```

Plain English: divide all configured-period Copilot spend by merged PRs in the same period. If `pr_total_merged = 0`, return `null`. This metric MUST also appear as a V1 Overview headline or sub-row tile.

### `$ / active user`

```text
dollars_per_active_user =
  safe_divide(total_spend, latest(fact_org_daily.monthly_active_users))
```

Plain English: divide all configured-period spend by MAU, consistent with the current V6 headline. The denominator MUST be MAU, not DAU or WAU. For a range tile, MAU SHOULD use the latest available `monthly_active_users` value on or before `end_date`. If MAU is `0` or unavailable, return `null`.

### `$ / 1k LoC delivered`

```text
dollars_per_1k_loc_delivered =
  safe_divide(total_spend * 1000, Σ fact_org_daily.loc_added_sum)
```

Plain English: divide spend by Copilot-delivered LoC added, scaled to a thousand-line unit. If `loc_added_sum = 0`, return `null`. The `<HowCalculatedPanel>` MUST explain that LoC is directional and not a quality or value measure, consistent with V3 in [`04-ui-and-views.md`](./04-ui-and-views.md#v3--code-generation).

### `$ / Copilot-authored PR`

```text
dollars_per_copilot_authored_pr =
  safe_divide(total_spend, Σ fact_org_daily.pr_total_merged_created_by_copilot)
```

Plain English: divide spend by merged PRs attributed as created by Copilot. If `pr_total_merged_created_by_copilot = 0`, return `null`. The panel SHOULD link to V4 Pull Requests because this denominator is related to delivery-based value in [`02-value-translation.md`](./02-value-translation.md#estimator-c--delivery-based-recommended-for-the-headline).

### `$ / active user trend`

```text
dollars_per_active_user_day[d] =
  safe_divide(total_spend_day[d], fact_org_daily.monthly_active_users[d])
```

Plain English: for each day, divide that day's spend by that day's MAU. The trend window SHOULD default to 90 days. `total_spend_day[d]` MUST equal daily billing spend plus daily AI-credit spend. Days with zero or missing MAU MUST be emitted as `null`, not interpolated.

### Phase 1: `$ / released feature`

```text
dollars_per_released_feature =
  safe_divide(total_spend, Σ release_count)
```

Plain English: divide spend by released features once Releases ingestion exists. This metric MUST NOT render in v1 production UI until `release_count` source lineage is specified. If `release_count = 0`, return `null`.

### Phase 2: issue-based unit economics

```text
dollars_per_closed_issue = safe_divide(total_spend, Σ issues_closed)
dollars_per_bug_closed   = safe_divide(total_spend, Σ bugs_closed)
cost_of_delay            = Σ(open_issue_age_days × dollars_per_dev_day)
```

Plain English: once Issues ingestion exists, divide spend by closed work items or estimate exposure from stalled issues. These metrics MUST NOT render in v1 production UI. `bugs_closed` MUST use configured labels. `dollars_per_dev_day` MUST be visible and editable wherever cost-of-delay renders.

## UI

### V6 Cost view extension (NOT a new view)

V6 Cost & Spend MUST be extended, not replaced. Add a **Unit economics** KPI row between the existing headline tiles and the daily-spend chart in [`04-ui-and-views.md`](./04-ui-and-views.md#v6--cost--spend).

The row MUST contain five tiles:

- `$ / merged PR`
- `$ / active user`
- `$ / 1k LoC delivered`
- `$ / Copilot-authored PR`
- `$ / active user trend` sparkline

`$ / active user` lives in the Unit economics row (moved out of the top KPI row to avoid duplication);
the `$ / active user trend` tile is its sparkline companion. Each tile MUST have a `<HowCalculatedPanel>`
with formula, actual numerator, actual denominator, date range, source facts, and zero-denominator
explanation when applicable. A zero/unavailable denominator MUST render `—`, never `$0`.

### Unit economics over time

At the bottom of V6, add **Unit economics over time** using the project's standard `<LineChart>`
wrapper (`apps/web/src/components/charts/line-chart.tsx`, Recharts-based; existing wrappers stay per
`AGENTS.md`). It MUST render four lines: `$ / merged PR`, `$ / active user`, `$ / 1k LoC delivered`, and `$ / Copilot-authored PR`.

X axis MUST be day. Y axis MUST be currency. Null daily points MUST create gaps rather than misleading zero-value dips. The chart SHOULD sit below existing spend breakdowns so users first understand total spend, then per-unit efficiency.

### V1 Overview row addition

V1 Overview MUST add `$ / merged PR` as a single tile in the existing headline or sub-row area. The tile MUST link to V6 Cost & Spend with the same date range selected.

## Privacy posture

Unit economics aggregate at org grain in v1. The UI MUST NOT show per-developer unit costs, per-developer spend, per-developer PR cost, rankings, or leaderboards, in accordance with [`CONSTITUTION.md`](./CONSTITUTION.md#2-privacy-by-default).

Team-grain unit economics are deferred to the Phase 2 team extension because they require the privacy thresholds and V7 behavior described in [`05-roadmap-and-phasing.md`](./05-roadmap-and-phasing.md#team-scorecards). When added, team-grain unit economics MUST inherit the same suppression threshold used by V7 Teams.

## Data and API expectations

Unit economics are served by a contract-driven read endpoint, **`GET /api/metrics/unit-economics`**
(ts-rest, `UnitEconomicsResponseSchema` in `packages/contracts`), which returns both range aggregates
and daily series. The response includes formula metadata so `<HowCalculatedPanel>` can render without
duplicating formula knowledge in UI components.

The response shape is (camelCase, matching repo convention):

```jsonc
{
  "currency": "USD",
  "metrics": [
    {
      "metricKey": "dollar-per-merged-pr",
      "label": "$ / merged PR",
      "value": 62.5,            // null when the denominator is 0/unavailable
      "currency": "USD",
      "numerator": 1000,        // total spend over the range (non-negative)
      "denominator": 16,        // merged PRs over the range (non-negative)
      "dateRange": { "from": "2025-10-01", "to": "2025-10-28" },
      "sourceTables": ["fact_billing_daily", "fact_ai_credits_daily", "fact_org_daily"],
      "formula": "Total spend ÷ merged PRs …",
      "series": [{ "day": "2025-10-01", "value": null }]
    }
  ],
  "overTime": [
    { "day": "2025-10-01", "dollarPerMergedPr": null, "dollarPerActiveUser": 20, "dollarPer1kLoc": null, "dollarPerCopilotPr": null }
  ]
}
```

The authoritative computation lives in `apps/web/src/server/queries/unit-economics.ts`
(`computeUnitEconomics`), which is **the single source of truth**: the Cost view and the Overview
`$ / merged PR` tile both consume it. Components MUST NOT recompute authoritative unit economics from
raw facts independently, per [`CONSTITUTION.md`](./CONSTITUTION.md#7-contract-driven-development).

## Open questions

- Should we expose individual SKU breakdowns, such as Copilot seats vs. premium requests vs. AI credits, as separate unit-cost overlays?
- Spend over which window: trailing 28 days for GitHub-dashboard alignment, or month-to-date for finance intuition? The recommendation is configurable, with 28 days as the default and MTD as a preset.
- **Resolved:** `$ / active user` lives in the Unit economics row (moved out of the top KPI row so it is shown exactly once), alongside its `$ / active user trend` sparkline as the fifth tile. The top KPI row carries the four spend totals only. Implemented in the Cost view.
- Should `$ / 1k LoC delivered` be renamed to avoid implying business value from LoC?
- Currency formatting consistency is handled centrally in `src/lib/format.ts`; no new formatting work is expected unless compact currency support is missing.
