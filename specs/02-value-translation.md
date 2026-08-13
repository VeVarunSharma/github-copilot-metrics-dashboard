# 02 — Value Translation

This is the differentiating spec. Every dollar figure in the product is computed by the formulas defined here, from inputs that are visible and editable by the user. **No opaque numbers.**

## Principles

1. **Show the math.** Every gold-layer metric MUST be traceable from the dashboard back to (a) the silver-layer counts that fed it and (b) the explicit knobs that scaled them. The dashboard MUST surface a "How is this calculated?" panel on every chart that uses a derived value.
2. **Three estimators, side by side.** We compute time saved three ways using different assumptions, show all three, and let the user pick which one drives the headline. This makes the product credible to skeptics — there is no single "magic number."
3. **Tunable defaults sourced from public research.** Every default constant cites where it comes from in the UI tooltip. Customers can override anything.
4. **Conservative bias.** When two interpretations of a constant are equally defensible, pick the lower one. Better to underclaim and be trusted than overclaim and be ignored.
5. **No per-developer ranking.** Translation runs at org grain and MAY run at team grain only after team privacy/readiness gates pass. It does not run at user grain in the UI.

## The three estimators

### Estimator A — Activity-based

Counts discrete Copilot interactions and assigns minutes saved per interaction.

```
hours_saved_activity =
    ( accepted_completions × min_per_accepted_completion
    + chat_requests        × min_per_chat_request
    + agent_sessions       × min_per_agent_session
    ) / 60
```

Where each input is summed from silver:

- `accepted_completions` = Σ `code_acceptance_activity_count` from `fact_org_daily_by_feature` where `feature = 'code_completion'`.
- `chat_requests` = Σ `user_initiated_interaction_count` from `fact_org_daily_by_feature` where `feature IN ('chat', 'ask', 'edit', 'plan')`.
- `agent_sessions` = derived from `fact_user_daily` where `used_agent = true`, counted as 1 session per active-agent user-day. (We don't get a session count directly; this is the conservative proxy.)

**Defaults & sources:**

| Knob                              | Default | Source / rationale                                                                                                  |
| --------------------------------- | :-----: | ------------------------------------------------------------------------------------------------------------------- |
| `min_per_accepted_completion`     | 0.75    | GitHub research: median time to write equivalent boilerplate ~30–90s. Conservative midpoint.                        |
| `min_per_chat_request`            | 2       | Internal benchmarks: typical Q&A or "explain this code" exchange saves 2–5 minutes of doc-hunting. Conservative end.|
| `min_per_agent_session`           | 30      | Agent sessions accomplish multi-step tasks (refactor, scaffolding, multi-file edits). Conservative for the median.  |

**Strengths.** Direct mapping from observable activity. No need for outside data.

**Weaknesses.** Susceptible to gaming if developers chat with no intent. Not all completions are equally valuable.

### Estimator B — Output-based

Converts lines of code added/changed via Copilot into developer-hour equivalents using an industry baseline.

```
hours_saved_output = loc_added_by_copilot_sum / loc_per_hour_baseline
```

Where:

- `loc_added_by_copilot_sum` = Σ `loc_added_sum` from `fact_org_daily` (totals across all features). Note this is **the total LoC the IDE accepted/applied through Copilot**, not the total LoC in the repo.
- `loc_per_hour_baseline` = configurable, default **30 LoC/hr** (long-running industry estimate of net production code per developer-hour, accounting for design + review + rework).

**Defaults & sources:**

| Knob                       | Default | Source / rationale                                                                                                   |
| -------------------------- | :-----: | -------------------------------------------------------------------------------------------------------------------- |
| `loc_per_hour_baseline`    | 30      | Frequently-cited industry range is 10–50 LoC/hr depending on language/domain. 30 is the conservative midpoint.       |

**Strengths.** Easy to explain. Strong correlation with "stuff Copilot wrote."

**Weaknesses.** This is the most contested estimator and we treat it as such — **it ships with a UI tooltip that explicitly recommends not leading with it.** LoC is a lossy proxy; deleted-and-rewritten code is undercounted; boilerplate weighs the same as algorithmic code. We surface it for transparency, not as the headline.

### Estimator C — Delivery-based (recommended for the headline)

Ties Copilot activity to actual shipped work via the PR metrics already in the API.

```
hours_saved_delivery =
    ( pr_merged_by_copilot     × min_saved_per_authored_pr
    + pr_reviewed_by_copilot   × min_saved_per_reviewed_pr
    + issues_closed_with_copilot × delta_min_vs_baseline           -- P2+
    ) / 60
```

Where (v1, PRs only):

- `pr_merged_by_copilot` = Σ `pr_total_merged_created_by_copilot` from `fact_org_daily`.
- `pr_reviewed_by_copilot` = Σ `pr_total_reviewed_by_copilot` from `fact_org_daily`.

**Defaults & sources:**

| Knob                           | Default | Source / rationale                                                                              |
| ------------------------------ | :-----: | ----------------------------------------------------------------------------------------------- |
| `min_saved_per_authored_pr`    | 60      | A small-to-medium PR takes ~1.5–4 hours of focused dev time. Saving ~1 hr is conservative.       |
| `min_saved_per_reviewed_pr`    | 15      | Average PR review = 30–60 min. Copilot review summary saves 15 min on the median.                |

**P2+ extension knobs** (active only when the relevant delivery-quality expansion gates pass; default to null/disabled until then):

- `min_saved_per_deployment` (default 30) — minutes Copilot saved per deployment, attributable when DORA Deployment Frequency data is available
- `min_saved_per_incident_recovered` (default 90) — minutes Copilot contributed to MTTR reduction, attributable when DORA MTTR data is available

These knobs are OFF by default and SHOULD only contribute to the delivery estimator when the delivery-quality silver/gold tables from [`./06-delivery-and-quality.md`](./06-delivery-and-quality.md) are populated and the launch-readiness gates in [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md) pass.

**Strengths.** Tied to delivered, merged, reviewed work — the thing CFOs actually care about. Defensible because the inputs are GitHub's own counts.

**Weaknesses.** Doesn't capture Copilot's value in solo work, exploration, or non-PR coding. We acknowledge this in the UI: "Delivery-based is conservative — it under-counts day-to-day productivity gains."

### P2 enhancement — delivery-based with delta-vs-baseline

Once GH Issues or ticket ingestion passes the P2 gates, we can compute:

```
delta_min_vs_baseline =
    median_cycle_time_issues_closed_by_non_copilot_users
  − median_cycle_time_issues_closed_by_copilot_users
```

This converts the delivery estimator from a fixed-multiplier into a **measured** delta — the strongest possible value claim. It is gated on having ≥30 closed issues in each cohort to be statistically meaningful; otherwise it falls back to the fixed multipliers.

## Dollar conversion

```
dollars_saved_X = hours_saved_X × avg_loaded_eng_cost_per_hour
```

Where `avg_loaded_eng_cost_per_hour` is a knob with default **$100/hr**. The default and the tooltip both note: "Loaded cost = salary + benefits + overhead, divided by ~1,800 productive hours/year. Adjust for your geography and seniority mix."

Currency is configurable (default USD). All Billing API amounts are also normalized to the configured currency at ingestion time using the rate the API returns.

## ROI

```
total_spend_daily      = seat_cost_daily + premium_request_spend_daily + ai_credit_spend_daily
net_value_daily        = dollars_saved_blended − total_spend_daily
roi_ratio_daily        = net_value_daily / total_spend_daily
```

Where:

- `seat_cost_daily` = (active_seats × monthly_seat_price) / days_in_month, drawn from `fact_billing_daily`.
- `premium_request_spend_daily`, `ai_credit_spend_daily` = drawn from `fact_billing_daily` and `fact_ai_credits_daily` respectively.

The dashboard surfaces ROI as a percentage and as an absolute dollar net. A negative ROI is shown explicitly — we do not suppress unfavorable numbers, because hiding bad news is exactly the credibility failure we're trying to fix in the market.

## The "blended" headline number

The Executive Value Summary view shows ONE big number: `dollars_saved_blended`. By default this is set to **estimator C (Delivery-based) only**. Users can change the blend in Settings:

- Single estimator (A, B, or C).
- Average of any two or all three.
- Custom weighted blend (sums to 1.0).

The current blend is shown explicitly under the headline number ("Based on: Delivery — change in Settings"). There is no hidden default math. The Overview also renders a **value bridge** — "You paid → Copilot saved (blended) → Net value → ROI" — so the cost-to-value relationship is legible on one screen, with a link to the Cost & Spend view for the spend breakdown.

## Knob storage and recomputation

All current value knobs live in the `settings` table as a single JSON object under the canonical key `value_translation_knobs`:

```jsonc
{
  "currency": "USD",
  "avg_loaded_eng_cost_per_hour": 100,
  "min_per_accepted_completion": 0.75,
  "min_per_chat_request": 2,
  "min_per_agent_session": 30,
  "min_saved_per_authored_pr": 60,
  "min_saved_per_reviewed_pr": 15,
  "min_saved_per_deployment": null, // P2+; UI default is 30 when enabled
  "min_saved_per_incident_recovered": null, // P2+; UI default is 90 when enabled
  "loc_per_hour_baseline": 30,
  "blend": { "activity": 0, "output": 0, "delivery": 1 }
}
```

The TypeScript knob shape mirrors the settings JSON and keeps P2+ delivery knobs optional until their source tables are populated:

```ts
interface ValueKnobs {
  currency: string;
  avg_loaded_eng_cost_per_hour: number;
  min_per_accepted_completion: number;
  min_per_chat_request: number;
  min_per_agent_session: number;
  min_saved_per_authored_pr: number;
  min_saved_per_reviewed_pr: number;
  min_saved_per_deployment?: number;        // P2+
  min_saved_per_incident_recovered?: number; // P2+
  loc_per_hour_baseline: number;
  blend: { activity: number; output: number; delivery: number };
}
```

When any knob changes via the Settings UI:

1. Persist the new current `value_translation_knobs` object. P0 MAY use one current settings row; if knob-change history is needed later, it MUST be added as a separate audit table rather than overloading the single-key `settings` row.
2. Start or queue a collector-owned rebuild of `fact_value_daily`, `fact_team_value_daily`, and `fact_roi_daily` when a job runner is configured. The web app MUST NOT silently claim that recomputation started unless a rebuild was actually started or queued. If no runner is configured, the UI/API MUST state that gold values update after the next collector gold rebuild.
3. Snapshot the knob set into each gold row's `knob_snapshot jsonb` column so historical exports remain reproducible.

This snapshot column is the P0 audit trail for historical values: if a customer exports a PDF report under one set of assumptions and someone later changes the knobs, the original report's numbers must remain explicable.

## Cost-savings calculator (standalone)

The standalone calculator (UI spec in 04) uses **the exact same formulas** as Estimator A, but with the customer's hand-entered inputs in place of API-sourced counts:

```
hours_saved_activity_calc =
    ( seats × monthly_completions_per_seat × accept_rate × min_per_accepted_completion
    + seats × monthly_chat_requests_per_seat × min_per_chat_request
    + seats × pct_using_agent × monthly_agent_sessions_per_seat × min_per_agent_session
    ) / 60
```

The defaults for `monthly_completions_per_seat`, `monthly_chat_requests_per_seat`, etc. come from public benchmarks — see UI spec 04 for the inputs and ranges. The calculator is identical math, identical knobs, just substituting estimated counts for measured counts.

## What we will NOT claim

Explicitly out of scope for v1:

- **"Bug reduction" / quality claims** — we don't have the data to support them. Phase 2+ if/when we ingest issue/incident data.
- **"Onboarding time reduction"** — same reason.
- **"Revenue impact"** — too far downstream of the data we have. Customers can layer this on top using their own financial models.
- **Future-state forecasts** — no ML projection in v1.

## Open questions

- **Default blend**: should it be 100% delivery, or a 50/50 activity/delivery? Delivery-only undersells in early-adoption orgs that haven't merged enough Copilot PRs yet. Considering an auto-fallback: if delivery-based < 5% of activity-based, blend in some activity weight.
- **Currency conversion**: do we trust the rates returned by the Billing API for non-USD orgs, or should we let users override?
- **PR-level dedup**: a single PR can be both authored AND reviewed by Copilot. Today we count both — should we deduct the overlap? Decision: keep both and add an explicit "double-counted dual-Copilot PRs" line in the breakdown.
- **Negative-value surfacing**: low-adoption orgs will show negative ROI. **Resolved:** the headline leads with dollars/hours saved; ROI and net value appear as secondary tiles and in the Overview value bridge, where negative values are shown explicitly (never suppressed).
