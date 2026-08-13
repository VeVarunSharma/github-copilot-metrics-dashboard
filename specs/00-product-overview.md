# 00 — Product Overview

## Product name

**GitHub Copilot Metrics Dashboard** is the product name. Subsequent mentions MAY use **Copilot Metrics Dashboard**.

Copilot Metrics Dashboard is an OSS self-hosted GitHub Copilot metrics and value dashboard for long-horizon Copilot usage, cost, adoption, and outcome evidence.

## Problem

Customers buying GitHub Copilot (GHCP) struggle to justify the spend to their CFO and exec sponsors. The native GitHub Copilot dashboard:

1. Only retains **28 days** of usage data — no longitudinal trend, no quarterly reporting, no before/after comparisons.
2. Stops at **usage metrics** — code completions, acceptance rate, DAU/WAU, language breakdown. It does **not** translate any of those into business outcomes.
3. Does not relate Copilot activity to **delivered work** — issues closed, PRs shipped, tickets completed.
4. Does not surface **cost** alongside value — seat licenses, premium-request consumption, and AI-credit spend live in separate billing surfaces. There is no single "is this worth it?" number.

The result: customers spend $19/user/month (or $39 for Business, or $39+ for Enterprise) plus variable premium-request and AI-credit charges, and they cannot answer the single question their CFO asks: **"What did we get for it?"**

This is the most common objection raised in renewal conversations. Telling the value story — quantitatively, defensibly, and without overclaiming — is the job this product does.

## Goals

The product MUST:

1. **Ingest the GitHub Copilot Metrics API** at organization scope, persist it indefinitely (default Postgres; lakehouse-ready schema for Phase 2 Fabric mirror), and backfill up to the 1-year API limit (data starts 2025-10-10). Enterprise-scope endpoint variants MAY exist as preview configuration, but they are not part of the P0 readiness claim until the gates in [`./08-launch-readiness-and-priorities.md`](./08-launch-readiness-and-priorities.md) explicitly promote them.
2. **Ingest the GitHub Billing Usage API and AI Credits API** to track seat cost, premium-request consumption, and AI credit spend alongside usage metrics.
3. **Translate usage into time saved and dollars saved** using a transparent, configurable methodology. Every dollar figure on screen MUST be defensible from explicit inputs visible to the user.
4. **Correlate Copilot activity with PR throughput** in v1 using the PR fields already returned by the Metrics API (`total_created_by_copilot`, `total_merged_created_by_copilot`, `median_minutes_to_merge_copilot_authored`, etc.).
5. **Provide a standalone cost-savings calculator** that anyone can use without API access, to estimate ROI before adoption or for ad-hoc what-if analysis.
6. **Run as OSS, deploy primarily to Azure** with a clean docker-compose path for local dev. Customers run it themselves; their data does not leave their infrastructure.

## Non-goals (v1)

The product MUST NOT, in v1:

- Replace GitHub's native dashboard for real-time team management.
- Provide individual-developer ranking ("Bob accepted 12 suggestions this week"). Per-user data is ingested but the UI surfaces team-level and org-level aggregates only, to avoid creating a surveillance tool.
- Predict future usage or savings (no ML forecasting in v1).
- Integrate with Jira, AzDO, or Linear (Phase 2).
- Write directly to Microsoft Fabric / OneLake (Phase 2). v1 ships parquet export to local disk as the on-ramp; native OneLake writer comes later.
- Claim GitHub Enterprise-scope readiness, Cost Centers, or multi-org/multi-tenant SaaS hosting as part of P0. Enterprise endpoint variants MAY be exercised as preview/advanced paths, but enterprise-scale source auth, cost-center rollups, and GitHub App installation flows remain P2 unless promoted by spec 08.
- Use a GitHub App for auth (Phase 2). v1 uses classic PAT.

## Target users (personas)

| Persona              | Role                              | Top question                                                        |
| -------------------- | --------------------------------- | ------------------------------------------------------------------- |
| **Eng leader**       | VP Eng / Director / Eng Manager   | "Is Copilot saving us enough engineering time to justify the spend?" |
| **GHCP admin**       | Platform / DevEx / IT             | "Where is adoption stalling, and what should I do about it?"        |
| **Field/CSA**        | MS or partner customer-facing     | "How do I quickly produce a value report for this customer's QBR?"   |
| **Finance partner**  | FP&A / CFO office                 | "What's our net spend after Copilot's productivity gains?"          |

The eng leader and CSA are the primary personas in v1. The admin gets the adoption views; the finance partner gets the cost views and ROI summary.

## Success criteria

The product is successful in v1 if:

- A customer can install it, point it at their org, and within **15 minutes** see a working dashboard backfilled with at least 28 days of data.
- The Executive Value Summary view answers the question "what did Copilot save us this month, in dollars?" with a single headline number AND a clear "show me how this is calculated" trail.
- The cost-savings calculator can be used standalone (no install, no API key) to produce a defensible savings estimate from team size + cost inputs.
- The schema and ingestion pipeline are clean enough that adding the Phase 2 Fabric writer is a near-mechanical lift, not a rewrite.
- **P0 OSS Beta readiness:** the demo path MUST look complete, core views MUST be populated and honest about missing data, public docs MUST explain auth and privacy, and users MUST get to a working value story quickly. A release MUST NOT describe itself as production self-host ready until P1 gates pass.

## Differentiators (vs. prior art)

Two open-source projects already exist in this space:

- **`microsoft/copilot-metrics-dashboard`** — Azure reference impl (.NET + React + Cosmos). Has the dashboard layer, has good UX. Does not translate usage to dollars, does not correlate with delivery, does not track Copilot spend.
- **`github-copilot-resources/copilot-metrics-viewer`** — Vue OSS dashboard. Read-only, no persistence beyond session, no value/ROI story.

This product's differentiation is the union of:

1. **Transparent value translation engine** with three side-by-side estimators and tunable knobs.
2. **Cost-aware ROI** combining Metrics API + Billing API + AI Credits API.
3. **Lakehouse-shaped schema** designed from day 1 for OneLake/Fabric mirroring in Phase 2.
4. **Standalone calculator** anyone can use without install — a marketing surface and a sales-engineering tool.
5. **Outcome correlation** — PRs in v1, issues/tickets in Phase 1+ — so the story isn't just "lines of code."

## Open questions

- **Per-user identity in the UI**: resolved for P0 — user logins are pseudonymized by default, and any raw-login display remains an explicit admin/operator opt-in with no leaderboard or ranking affordance.
- **License clarification**: MIT today; confirm with any owning org before public release.
