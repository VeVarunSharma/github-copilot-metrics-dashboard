# Contributing to Copilot Metrics Dashboard

Copilot Metrics Dashboard is in **P0 OSS Beta**: the goal is a trustworthy demo and real-data value story for GitHub Copilot usage, spend, ROI, adoption, and PR evidence. Do not claim production self-host readiness until the P1 gates in `specs/08-launch-readiness-and-priorities.md` pass.

## Before you start

Read:

- `specs/CONSTITUTION.md`
- `specs/08-launch-readiness-and-priorities.md`
- `AGENTS.md`
- The relevant spec under `specs/`

Prerequisites: Node.js 20+, pnpm 10, Docker, and optional GitHub credentials for real-data ingestion.

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm db:migrate
```

### Demo mode

No GitHub credentials are required.

```bash
pnpm db:seed:demo
pnpm web
# open http://localhost:3000
```

Demo data uses synthetic `demo-org` data and is safe to clear with:

```bash
pnpm db:seed:clear-demo
```

### Real-data mode

Set `GITHUB_TOKEN` and `GITHUB_ORGS` or `GITHUB_ENTERPRISE` in `.env`, then run:

```bash
pnpm collect
pnpm web
```

For historical ingestion:

```bash
pnpm collect:backfill --from YYYY-MM-DD --to YYYY-MM-DD
```

Keep credentials local. Do not commit `.env`, tokens, logs with tokens, raw customer payloads, or screenshots that expose private org data.

## Development workflow

1. Create a focused branch.
2. Make the smallest complete change that satisfies the relevant spec.
3. Keep web API changes contract-first in `packages/contracts`.
4. Keep collector writes idempotent and bronze-retained where raw source bytes exist.
5. Keep value-engine logic pure and auditable.
6. Add or update tests for behavior changes.
7. Update docs/specs when the change affects user-visible behavior, data model, value methodology, public API, or deployment topology.

Useful checks:

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm -r build
```

For docs/template-only changes, the full suite is not required; validate the changed Markdown/YAML and explain any skipped checks in the PR.

## Spec-first rule

Constitution Principle 8 controls: material product, data, methodology, API, or deployment changes must land with matching `specs/` updates. If the spec and code would drift, update the spec first.

## Privacy and Constitution checklist

Before opening a PR, confirm:

- Principle 1: derived hours, dollars, ROI, and unit economics are reproducible from visible inputs.
- Principle 2: no per-developer ranking, leaderboard, or surveillance affordance is introduced.
- Principle 3: the web app remains read-only and does not hold outbound GitHub credentials.
- Principle 7: HTTP surfaces are defined through ts-rest contracts.
- Principle 8: required spec updates are included.
- Principle 10: no phone-home telemetry, SaaS dependency, or external analytics collection is added.
- Secrets and customer data are excluded from code, issues, logs, fixtures, and screenshots.
