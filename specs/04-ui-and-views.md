# 04 — UI & Views

This spec defines the dashboard screens, the questions they answer, the charts they surface, and the data they pull from. The number prefix on each view (`V1`–`V8`) is the canonical reference used elsewhere in the docs; launch visibility follows the priority taxonomy in [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md).

## Information architecture

```
P0 top nav
├── Setup                 — public onboarding checklist and real-data connection guide
├── Overview              (V1)  — landing page
├── Adoption              (V2)
├── Code Generation       (V3)
├── Pull Requests         (V4)
├── Cost & Spend          (V6)
├── Calculator            (V8)  — public, no auth
└── Settings                    — value-translation knobs, ingestion status
```

Org switcher in the top-left. Org selection is URL-backed: when `?orgId=` names a real org, the switcher MUST show that org and top-nav links MUST preserve the same `orgId`; unknown orgs fall back through the standard resolver and MUST NOT appear selected. Date-range picker (default: last 28 days, presets: 7d / 28d / 90d / YTD / all-time) in the top-right; persists per-user via cookie. The Setup guide MAY appear in navigation but MUST remain informational: it MUST NOT request, store, or transmit GitHub credentials.

### View priority tiers

View priority is a release-readiness model, not a statement of long-term importance. It controls whether a view can appear as first-class navigation.

| Tier | Views / capabilities | Default navigation behavior |
| --- | --- | --- |
| **P0 core** | Overview, Adoption, Code Generation, Pull Requests, Cost & Spend, Calculator, Settings | MAY appear as first-class navigation when populated by demo and real data and backed by methodology explanations. |
| **P1 advanced / preview** | Delivery Velocity, Engineering Health, Consumption Patterns until ingestion/privacy gates mature | MAY appear only as explicitly labeled **Preview** or **Advanced** views; they MUST NOT be launch-critical P0 tabs. |
| **P2 hidden / feature-flag / coming-soon** | Tickets, Teams, GitHub Issues, GHAS/Security Health, Jira/Azure DevOps/Linear, Fabric/OneLake, forecasting/anomaly detection | MUST be hidden, feature-flagged, or represented only by explicit Coming Soon pages until source ingestion, privacy, methodology, demo data, tests, contracts, and docs satisfy spec 08 decision gates. |

### Navigation behavior rules

- A P0 release MUST NOT show empty first-class tabs. If a P0 nav item cannot be populated for demo mode and configured real-data mode, it MUST be removed from first-class navigation until ready.
- Stub routes MUST be hidden from top nav, feature-flagged, or rendered as explicit Coming Soon pages that cannot be mistaken for launch-complete product surfaces.
- Advanced or preview views MUST be labeled wherever they are linked, routed, or shown in navigation.
- P2 surfaces MUST NOT contribute proof points to the V1 value story until their data source and methodology gates pass.
- Generic GHAS or security posture MUST NOT be part of V1. Security may enter the value story only in a later Copilot-attributed module, such as Copilot Autofix-assisted remediation, with explicit formulas and caveats.

## Design conventions

- **Design system:** the dashboard follows the GitHub brand design system in [`../DESIGN.md`](../DESIGN.md) (Constitution Principle 11): a neutral-anchored, green-tinted palette with **GitHub Green** as the single hero, **Copilot Purple** reserved for Copilot-attributed data, **Security Blue** for security-attributed modules, and blue inline links. Type is **Mona Sans** / **Mona Sans Mono** (self-hosted). Dark mode is first-class. Tokens live in `globals.css`; components consume them (no ad-hoc hex).
- **Three layers per page:** (1) headline KPI tiles at the top, (2) primary chart in the middle, (3) breakdown panels below.
- **Every derived number** has a small ⓘ icon that opens a "How is this calculated?" panel showing the formula and the current knob values.
- **Empty-state cards** never just say "no data" — they tell the user what would produce data and link to the relevant doc. When the GitHub Metrics API start date is relevant, they MAY mention that reports start 2025-10-10, but runtime fallbacks MUST NOT use that date as a generic placeholder for unrelated missing data. Unknown operational dates MUST render as `—` or a clearly labeled unknown state, not as a synthetic report start date.
- **Skeleton loaders** for all charts; no layout shift on data load.
- **Auth-disabled banner:** when inbound auth resolves to `AUTH_MODE=open`, dashboard-shell routes MUST show a prominent warning that the dashboard is public to anyone who can reach the URL and cite `docs/auth.md` for the identity-aware ingress/OIDC or shared-password options. Settings mutations MUST NOT be available in open mode.
- **Public onboarding route:** `/getting-started` MUST explain the demo-first flow, collector-only GitHub credential boundary, classic PAT scopes, preflight checks, short-window backfill, and post-ingestion app verification. It MUST link to the fuller onboarding documentation and MUST NOT collect tokens in the browser.
- **Color palette:** a diverse, colorblind-aware **10-hue categorical ramp** drawn from GitHub's brand secondary scales (`--chart-1 … --chart-10`, theme-aware light + dark, defined in `globals.css` and consumed via `src/components/charts/palette.ts`). Rules:
  - **Categorical breakdowns** (bars / treemap / pie split by IDE, model, language, feature, workflow, …) colour **each category** with a distinct hue from the ramp — never a single flat fill.
  - **Multi-series** charts cycle the ramp by series index so adjacent series stay distinguishable.
  - **Single-metric time-series** (e.g. releases/day, CI success, cost forecast) stay on a **single accent** — rainbow-per-point would imply meaning that isn't there.
  - **Semantic reservations** (per `../DESIGN.md`): **value / headline** series ($ saved, hours saved) use **GitHub Green** (`--chart-value`); **Copilot-attributed** series use **Copilot Purple** (`--chart-copilot-1`); **non-Copilot baselines** use a **neutral gray** (`--chart-baseline`); failure/restore metrics use red/orange; security-attributed series use Security Blue. Colour MUST NOT be the sole carrier of meaning — always pair with labels or legends.
- **Privacy:** user logins are pseudonymized by default. Raw-login display is an explicit admin/operator opt-in and MUST NOT create leaderboard, ranking, or selected-user surveillance affordances.

---

## V1 — Overview (Executive Value Summary)

**Audience.** Eng leader, CSA. The default landing page after login.

**Top question answered.** "What did Copilot save us, what did it cost, and is the claim auditable?"

**Flagship hierarchy.** V1 MUST stay simpler than the supporting views. The first screen MUST prioritize, in order: (1) dollars saved, (2) hours saved, (3) ROI and net value, (4) a spend-vs-value bridge, (5) unit economics, then (6) supporting evidence from adoption, code generation, and pull requests. Security posture, GHAS coverage, and other non-Copilot-attributed signals MUST NOT appear in V1.

**Layout.**

```
┌─────────────────────────────────────────────────────────────────┐
│  ★ HEADLINE                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  $X saved        │  │  N hours saved   │  │  ROI:  Y%      │ │
│  │  this month      │  │  this month      │  │  Net $Z        │ │
│  │  ⓘ Delivery-based│  │                  │  │                │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
│  Methodology basis: blended estimator · conservative-bias note    │
├─────────────────────────────────────────────────────────────────┤
│  PRIMARY BRIDGE — You paid → Copilot saved → Net value → ROI     │
│  Link: "See full Cost & Spend"                                  │
├─────────────────────────────────────────────────────────────────┤
│  UNIT ECONOMICS                                                  │
│  $ / merged PR · $ / active user · $ / 1k LoC · $ / Copilot PR   │
├─────────────────────────────────────────────────────────────────┤
│  SUPPORTING EVIDENCE                                             │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │ Dollars saved trend    │  │ Estimator comparison           │ │
│  │ Activity/output/deliv. │  │ table — A vs B vs C            │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│  Sub-row: active users · acceptance rate · Copilot PR evidence   │
└─────────────────────────────────────────────────────────────────┘
```

**Charts.**

| Element                          | Type         | Source                                                |
| -------------------------------- | ------------ | ----------------------------------------------------- |
| `$ saved this month`             | KPI tile     | `fact_roi_daily.dollars_saved_blended` SUM (MTD)      |
| `Hours saved this month`         | KPI tile     | `fact_roi_daily.hours_saved_blended` SUM (MTD)        |
| `ROI %` and `Net $`              | KPI tile     | `fact_roi_daily.roi_ratio` and `net_value`            |
| Headline basis line              | inline text  | `settings.value_translation_knobs.blend` → "Based on: &lt;estimator&gt; — change in Settings" + conservative-bias note (Constitution P9) |
| Spend-vs-value bridge ("Is Copilot worth it?") | primary panel | `fact_billing_daily`, `fact_ai_credits_daily`, `fact_roi_daily` — You paid → Copilot saved (blended) → Net value → ROI, linking to V6 |
| Unit economics row               | KPI tiles (linked) | unit-economics endpoint; includes `$ / merged PR`, `$ / active user`, `$ / 1k LoC`, `$ / Copilot-authored PR`; links to V6 Cost & Spend with the same date range (spec 07) |
| `Dollars saved per day`          | stacked area | `fact_value_daily` grouped by estimator               |
| Estimator comparison             | table        | three rows from `fact_value_daily`; the row(s) driving the headline are flagged, with a one-line explainer of the three estimators |
| Supporting evidence strip        | inline tiles | `fact_org_daily` and PR facts: active users, acceptance %, Copilot PR count, merged/reviewed PR evidence |

**Drilldowns.** Clicking the headline `$ saved` tile opens the assumptions modal (knobs + formula). Clicking any chart segment opens the corresponding P0 evidence view (Adoption → V2, Code Generation → V3, PRs → V4, Spend → V6).

---

## V2 — Adoption & Engagement

**Audience.** GHCP admin.

**Top question answered.** "Where is adoption healthy and where is it stalling?"

**Layout.**

```
KPI row:  DAU · WAU · MAU · WAU/seats ratio · Acceptance rate · Agent adoption %
Primary:  DAU + WAU dual-line over time
Below:    Acceptance rate trend  ·  Chat-mode breakdown (ask/edit/plan/agent stacked bar)
Bottom:   Most-used IDE · Most-used model · Funnel: Licensed → Active → Chat → Agent
```

**Charts.**

| Element                  | Type         | Source                                                                |
| ------------------------ | ------------ | --------------------------------------------------------------------- |
| DAU / WAU / MAU          | KPI tiles    | `fact_org_daily.daily/weekly/monthly_active_users` (latest day)        |
| WAU/seats ratio          | KPI tile     | `weekly_active_users / fact_billing_daily.seat_count`                  |
| Acceptance rate          | KPI tile     | `code_acceptance_activity_count / code_generation_activity_count`     |
| Agent adoption %         | KPI tile     | `monthly_active_agent_users / monthly_active_users`                   |
| DAU/WAU trend            | dual line    | `fact_org_daily` over date range                                      |
| Acceptance rate trend    | line         | derived ratio per day                                                 |
| Chat-mode breakdown      | stacked bar  | `fact_org_daily_by_feature` filtered to chat features                 |
| Most-used IDE            | horizontal bar | `fact_org_daily_by_ide` summed                                      |
| Most-used model          | horizontal bar | `fact_org_daily_by_model_feature` summed                            |
| Adoption funnel          | sankey/funnel | computed from billing seats + active counts                          |

**Empty-state interpretation panel.** Below the funnel, an interpretation card translates the data into actions:

- "WAU/seats < 60%? → Some licensed users aren't engaging. Consider an enablement campaign."
- "Agent adoption < 20%? → Users haven't progressed past completions. Share agent demos."

These map 1:1 to the GitHub doc on interpreting adoption metrics.

---

## V3 — Code Generation

**Audience.** Eng leader, GHCP admin.

**Top question answered.** "How much code is being generated, where, and by which features?"

**Layout.**

```
KPI row:  LoC added · LoC deleted · LoC changed total · Acceptance rate · Agent contribution %
Primary:  Daily LoC added vs. deleted (stacked area, user-initiated vs. agent)
Below:    LoC by language (treemap)  ·  LoC by feature (stacked bar)
Bottom:   LoC by IDE  ·  LoC by chat mode  ·  LoC by model
```

**Charts.**

| Element                    | Type        | Source                                                       |
| -------------------------- | ----------- | ------------------------------------------------------------ |
| LoC added / deleted        | KPI tiles   | `fact_org_daily.loc_added_sum`, `loc_deleted_sum` SUM         |
| LoC changed                | KPI tile    | added + deleted                                              |
| Agent contribution %       | KPI tile    | LoC from features `agent`/`edit`/custom ÷ total LoC          |
| Daily LoC                  | stacked area| `fact_org_daily_by_feature` over time, grouped user vs. agent |
| LoC by language            | treemap     | `fact_org_daily_by_language_feature`                         |
| LoC by feature             | stacked bar | `fact_org_daily_by_feature`                                  |
| LoC by IDE                 | horizontal bar | `fact_org_daily_by_ide`                                  |
| LoC by chat mode           | bar         | `fact_org_daily_by_feature` filtered to chat features        |
| LoC by model               | horizontal bar | `fact_org_daily_by_model_feature`                        |

**Caveat panel.** A muted disclosure at the bottom: "LoC is a directional measure of Copilot output, not a measure of value. See the Pull Requests view for delivered-work metrics."

---

## V4 — Pull Requests

**Audience.** Eng leader (this is the strongest single value signal).

**Top question answered.** "How much of our shipped work is Copilot-touched, and is it landing faster?"

**Layout.**

```
KPI row:  PRs created · % by Copilot · PRs merged · % merged by Copilot · % reviewed by Copilot
Primary:  Stacked area — PRs merged per day (Copilot-authored / Copilot-reviewed / neither)
Below:    Median time-to-merge (line, Copilot vs. non-Copilot)
Bottom:   Suggestions: total / applied / Copilot-applied (bar)
          Authored vs. reviewed Venn (with overlap callout — see spec 02)
```

**Charts.**

| Element                       | Type        | Source                                                          |
| ----------------------------- | ----------- | --------------------------------------------------------------- |
| PRs created                   | KPI tile    | `fact_org_daily.pr_total_created` SUM                           |
| % by Copilot                  | KPI tile    | `pr_total_created_by_copilot ÷ pr_total_created`                |
| PRs merged                    | KPI tile    | `fact_org_daily.pr_total_merged` SUM                            |
| % merged by Copilot           | KPI tile    | `pr_total_merged_created_by_copilot ÷ pr_total_merged`          |
| % reviewed by Copilot         | KPI tile    | `pr_total_reviewed_by_copilot ÷ pr_total_reviewed`              |
| Daily PRs merged              | stacked area| `fact_org_daily.pr_*` over time                                 |
| Time-to-merge                 | dual line   | `pr_median_minutes_to_merge` vs. `_copilot_authored`            |
| Suggestions breakdown         | bar         | `pr_total_suggestions`, `pr_total_applied_suggestions`, `pr_total_copilot_suggestions`, `pr_total_copilot_applied_suggestions` |
| Authored ∩ Reviewed           | Venn / table| derived overlap                                                  |

**This view is also the link between V1 and the delivery-based estimator.** Clicking the "% merged by Copilot" tile opens a side panel showing the estimator C calculation in real-time.

---

## V5 — Tickets *(P2 hidden / feature-flag)*

Not a P0 first-class tab. Until the gates in [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md) pass, this route MUST be hidden, feature-flagged, or rendered only as an explicit Coming Soon page. When ready, it will surface issue throughput, Copilot-user overlay, and cycle-time delta with defined formulas, sample thresholds, privacy controls, and source-specific caveats.

---

## V6 — Cost & Spend

**Audience.** Eng leader, finance partner.

**Top question answered.** "What are we actually paying for Copilot, broken down by category?"

**Layout.**

```
KPI row:  Total spend (MTD) · Seat cost (MTD) · Premium-request spend (MTD) · AI-credit spend (MTD)
Unit econ:  $ / merged PR · $ / active user · $ / 1k LoC delivered · $ / Copilot-authored PR · $ / active user trend (sparkline)
Primary:  Stacked bars per day — seat / premium / ai-credits
Below:    Spend by model (pie/donut)  ·  Cost per chat request trend
Bottom:   Burndown vs. included pool · Forecast end-of-month spend (linear)
          Unit economics over time (4-line: $/merged PR, $/active user, $/1k LoC, $/Copilot-authored PR)
```

`$ / active user` appears once, in the Unit economics row (moved out of the top KPI row to avoid the
prior duplication). Unit-cost tiles render `—` (not `$0`) whenever the denominator is zero or
unavailable; null daily points are gaps, never zero-value dips. See
[`./07-unit-economics.md`](./07-unit-economics.md) for the full unit-economics spec and the
`/api/metrics/unit-economics` contract that feeds this row and chart.

**Charts.**

| Element                       | Type        | Source                                                     |
| ----------------------------- | ----------- | ---------------------------------------------------------- |
| Total spend MTD               | KPI tile    | `SUM(fact_billing_daily.net_amount + fact_ai_credits_daily.billed_amount)` MTD |
| Seat cost MTD                 | KPI tile    | `fact_billing_daily` filtered to Copilot seat SKUs         |
| Premium-request spend MTD     | KPI tile    | `fact_billing_daily` filtered to premium-request SKUs       |
| AI-credit spend MTD           | KPI tile    | `fact_ai_credits_daily.billed_amount` SUM                  |
| Unit economics row            | 5 KPI tiles | `/api/metrics/unit-economics` (spec 07): `$ / merged PR`, `$ / active user`, `$ / 1k LoC`, `$ / Copilot-authored PR`, `$ / active user trend` (sparkline). Null-guarded → `—` |
| Daily stacked bars            | stacked bar | combined facts                                             |
| Spend by model                | donut       | `fact_ai_credits_daily` grouped by model                   |
| Cost per chat request         | line        | `ai_credit_spend ÷ chat_request_count` per day             |
| Burndown vs included          | combo       | `included_quantity` vs `billed_quantity` from AI credits   |
| Forecast EOM spend            | line + band | linear projection from MTD trend                           |
| Unit economics over time      | line (4 keys) | `/api/metrics/unit-economics.overTime`; null points are gaps |

**Linked from V1's spend-vs-value chart and the V1 `$ / merged PR` tile. Links back to V1 via "See the full value story →".**

---

## V7 — Teams *(P2 hidden / feature-flag)*

Not a P0 first-class tab. Until team membership ingestion, privacy thresholds, methodology, demo data, and tests are mature, this route MUST be hidden, feature-flagged, or rendered only as an explicit Coming Soon page. When ready, it will show team scorecards (each team's adoption %, LoC, PRs, value, ROI) computed from `bridge_user_team` × `fact_user_daily`, never per-developer rankings.

---

## V8 — Cost-Savings Calculator (standalone, public)

**Audience.** Anyone — no auth required, no API access required. Marketing surface and pre-sales tool.

**Top question answered.** "If we adopted Copilot at our team, what would we save?"

**Layout.**

```
Two-column form on left, results on right (sticky on scroll).

LEFT — Inputs (with sensible defaults pre-filled):
  Team
    · # of developers                    [    50 ]
    · Avg loaded eng cost / hour         [  $100 ]
    · % of seats actively using Copilot  [   80% ]
  Activity assumptions (per active dev / month)
    · Accepted code completions          [   600 ]   ⓘ
    · Chat requests                      [   120 ]   ⓘ
    · Agent sessions                     [    20 ]   ⓘ
    · Estimated PRs Copilot-touched      [    12 ]   ⓘ
  Time-saved per interaction (advanced, collapsible)
    · Min per accepted completion        [  0.75 ]
    · Min per chat request               [     2 ]
    · Min per agent session              [    30 ]
    · Min saved per Copilot PR           [    60 ]
  Cost
    · Copilot Business seat / month      [   $39 ]
    · Estimated premium spend / dev / mo [    $5 ]

RIGHT — Results (live-update on input change):
  ┌───────────────────────────────────────────┐
  │  $ saved per month         $ XX,XXX        │
  │  Hours saved per month     N,NNN           │
  │  ROI                       YYY%            │
  │  Payback period            < 1 month / N mo│
  └───────────────────────────────────────────┘
  ┌───────────────────────────────────────────┐
  │  Bar: contribution by source              │
  │  Completions / Chat / Agent / PRs         │
  └───────────────────────────────────────────┘
  
  [ Copy results to clipboard ]  [ Print as PDF ]  [ Share link (encodes inputs in URL) ]
```

**Behavior.**

- All inputs in URL query params → shareable links that preserve the scenario.
- Defaults documented in tooltips with cited sources (GitHub research, McKinsey, Microsoft).
- "Reset to defaults" button.
- Print stylesheet produces a clean one-page PDF for sharing.
- All formulas come from `packages/value` — same engine as the dashboard.

**This page MUST work without a database connection.** Pure client-side computation.

---

## V9 — Consumption Patterns *(P1 preview)*

**Audience.** GHCP admin, engineering leader, finance partner.

**Top question answered.** "Which cohorts, teams/groups, features, and models drive Copilot consumption, and what cost-center or enablement action should we take?"

This view is **Preview** until real-data validation, privacy threshold behavior, demo data, contracts, tests, and docs are mature. It MUST NOT become a public per-developer leaderboard or provide selected-user surveillance affordances.

**Layout.**

```
KPI row:  Active users · Top 20% share · Top 10% share · Top team share · Premium model share · Included credit share
Primary:  Pareto/Lorenz concentration curve · Top/next/middle/long-tail cohort driver comparison
Below:    Team/group consumption · Model billed spend · Cost-conscious team/cohort chart
Bottom:   Cost-center suggestion cards · calculation/guardrail notes
```

**Charts and formulas.**

| Element | Type | Source / formula |
| --- | --- | --- |
| Top 20% / top 10% share | KPI | Sort users by `user_initiated_interaction_count + code_generation_activity_count + cli_request_count`; sum top cohort ÷ total. Cohort metrics MUST render unavailable until the represented cohort has at least 5 users. |
| Pareto/Lorenz curve | line | Cumulative users vs cumulative consumption and LoC, from `fact_user_daily`; points representing fewer than 5 users MUST be suppressed. |
| Cohort drivers | stacked bar | Top 10%, next 10%, middle 30%, long tail 50%; shares of interactions, LoC, chat, agent days, CLI requests. Cohorts below the privacy threshold MUST be suppressed or coarsened. |
| Team/group consumption | horizontal bar | `bridge_user_team` × `fact_user_daily` at `(user_id, day)`, suppressing teams with fewer than 5 active users. Users in multiple teams contribute to each joined team, so team shares are attribution signals rather than a strict allocation. |
| Model billed spend | horizontal bar | `fact_ai_credits_daily` grouped by model. If AI-credit billing facts are unavailable, billing-derived KPIs and charts MUST render unavailable rather than `0`. |
| Cost-conscious teams | horizontal bar | Team consumption compared with estimated billed model overage using user model facts when present. Model names from billing and usage facts MUST be normalized before joining; unmatched usage models MAY use an org-wide unit-cost fallback. |
| Cost-center suggestions | cards | Rules over top-cohort share, top-team share, premium model spend share, and included-vs-billed quantity. Billing-derived suggestions MUST be suppressed when AI-credit billing facts are unavailable. |

**Privacy rules.**

- The page MUST NOT expose a public named-user leaderboard, rank, or "top users" table.
- Team rows below 5 active users MUST be suppressed.
- Cohort and concentration outputs representing fewer than 5 users MUST be suppressed or coarsened.
- Public responses MUST NOT expose raw user IDs, logins, pseudonyms, or selected-user drilldown routes.
- Cost-center suggestions SHOULD be team/cohort/model scoped. Per-user cost-center assignment is out of scope.

---

## Settings

Two sections:

**Value-translation knobs** — every input from spec 02, with defaults, current value, source citation. The browser-editable form MUST validate non-empty currency, finite non-negative numeric knobs, and blend weights that sum to 1.0 before allowing save. Save MUST persist the canonical `value_translation_knobs` object and either start/queue a collector-owned gold rebuild with progress/status or clearly state that derived gold values update after the next collector gold rebuild. The UI MUST show save/error state and MUST NOT show a recompute progress indicator unless recomputation actually started or was queued.

**Ingestion status** — table of last 30 `ingestion_run` rows, status, row counts, error messages. If `target_day` is null or unavailable, the day cell MUST render `—` instead of a hardcoded fallback date. The public `/api/health` endpoint MAY expose only a coarse freshness summary for probes (`lastSuccessfulIngestionCompletedAt`, `lastSuccessfulIngestionTargetDay`, `staleDataStatus`, `staleDataWarning`, `staleAfterHours`); the authenticated Settings table remains the detailed operator view. Any "Run now" button is dev-only or operator-only and MUST be hidden/disabled in production unless a safe job-trigger mechanism exists.

**Data export** — button: "Export silver to parquet" → writes to `./exports/`. Phase 2 adds the Fabric/OneLake target.

**Privacy** — show the current pseudonymization posture. A raw-login toggle MAY exist only as an explicit admin/operator opt-in; otherwise the UI MUST label it as environment/operator configured. Cost-calculator share-links for non-authed users default on unless disabled by configuration.

## Open questions

- **Date range default — 28 vs 30 days?** GitHub's native dashboard uses 28; finance reports usually use calendar months. Leaning calendar month (MTD) for headline tiles, configurable trend window for charts.
- **Should the calculator estimate include token spend?** Probably yes, with a per-developer monthly estimate input. Need a defensible default — currently $5/dev/mo placeholder; awaiting better public data.
- **PDF export of full dashboard pages?** Useful for QBRs but complex to implement well. Defer beyond P0; calculator-only PDF in v1.
- **Mobile / small-viewport behavior?** Stack KPI tiles, hide breakdown charts behind tabs. Not a primary use-case but should not be broken.
