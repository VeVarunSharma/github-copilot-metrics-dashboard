# Specs

This folder holds the design specifications for **GitHub Copilot Metrics Dashboard**.

There are **five layers** of guidance in this repo. They are read in priority order — if a lower layer ever contradicts a higher one, the higher one wins until amended.

| # | Layer | Where | Length |
|--:| --- | --- | --- |
| 1 | **Constitution** — non-negotiable principles | [`CONSTITUTION.md`](./CONSTITUTION.md) | ~150 lines |
| 2 | **Design specs** — what we're building, in detail | this folder (`00`–`08`) | ~2,300 lines |
| 3a | **Agent workflow ops** — commands, conventions, gotchas | [`../AGENTS.md`](../AGENTS.md) | ~150 lines |
| 3b | **System orientation** — components, patterns, data flow | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | ~300 lines |
| 4 | **Path-scoped overlays** — narrow rules for specific dirs | [`../.github/instructions/`](../.github/instructions) | ~30–80 lines each |

GitHub Copilot's `.github/copilot-instructions.md` is a thin pointer at this hierarchy.

`ARCHITECTURE.md` follows the [architecture.md/](https://architecture.md/) template and is grounded in named patterns from [awesome-software-architecture](https://github.com/mehdihadeli/awesome-software-architecture): Medallion (Bronze/Silver/Gold), Hexagonal (Ports & Adapters), CQRS, Contract-First, Dimensional Modeling (Kimball), and Modulith.

## How to navigate

| #   | Document                                            | Read this if you want to know…                                          |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| —   | [Constitution](./CONSTITUTION.md)                   | The 10 non-negotiable principles every change MUST honor.               |
| 00  | [Product Overview](./00-product-overview.md)        | What we're building, who it's for, why it matters, what "done" means.   |
| 01  | [Data Sources & Model](./01-data-sources-and-model.md) | Which APIs we hit, auth requirements, the database schema.          |
| 02  | [Value Translation](./02-value-translation.md)      | How usage becomes time saved becomes dollars saved. The defensible math. |
| 03  | [Architecture](./03-architecture.md)                | Monorepo layout, components, deployment, contract-driven dev with ts-rest. |
| 04  | [UI & Views](./04-ui-and-views.md)                  | Every screen, the questions it answers, the charts, the queries.        |
| 05  | [Roadmap & Phasing](./05-roadmap-and-phasing.md)    | What ships in v1, Phase 1, Phase 2; explicit scope cuts.                |
| 06  | [Delivery & Quality](./06-delivery-and-quality.md)  | Delivery velocity, engineering health, DORA context, forecasts, and anomaly metrics. |
| 07  | [Unit Economics](./07-unit-economics.md)            | Per-unit Copilot spend metrics finance and engineering leaders can audit. |
| 08  | [Launch Readiness & Priorities](./08-launch-readiness-and-priorities.md) | Public-launch readiness and prioritization: P0/P1/P2 gates, plus what to hide or defer until trustworthy. |

## Conventions

- **Decisions are stated in normative language** ("MUST", "SHOULD", "MAY") per RFC 2119.
- **Every metric has a definition** — no ambiguous numbers in the dashboard. If a chart shows "Hours Saved", spec 02 explains exactly how it's computed.
- **Open questions live in the relevant spec, not a separate file** — under an `## Open questions` heading at the bottom. Resolved questions move into the body and the open-questions section is updated.

## Status

These specs are the **v0.1 baseline**. The constitution is version **1.0.0** (initial).

Material changes:

- **Constitution amendments** — PR labeled `spec:constitution`, version-bumped per semver, separate commit. See [Governance](./CONSTITUTION.md#governance) in the constitution itself.
- **Design spec changes** — PR with prefix `spec:` (e.g., `spec: add issues-correlation pages`). No version bump required for the design specs themselves, but the PR description SHOULD note which constitution principles informed the change.
- **Wording fixes** — direct merge OK.
