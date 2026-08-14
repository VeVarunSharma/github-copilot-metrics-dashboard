# Changelog

All notable release changes for Copilot Metrics Dashboard are documented here.

## v0.1.0-beta.1 - 2026-07-01

### Status

- Public OSS beta for the P0 value-story scope: Overview, Cost & Spend, Adoption, Code Generation, Pull Requests, Calculator, and Settings.
- This release is **not** production self-host ready. P1 production readiness remains gated by the checklist in [`specs/08-launch-readiness-and-priorities.md`](./specs/08-launch-readiness-and-priorities.md).
- P0 real-data support is org-scope. Enterprise endpoint behavior remains preview-only unless a future release note explicitly promotes it.

### Added and validated

- P0 release signoff now records the P0 checklist as complete for the beta scope.
- Tag-triggered release workflow validates the P0 gate, builds web and collector images, pushes versioned GHCR images, and publishes GitHub Release notes from this changelog.
- Package metadata now points to the inferred repository, issue tracker, and README homepage.
- Release documentation now records the beta/non-production boundary and current P1 limitations.

### Container images

The release workflow publishes:

- `ghcr.io/microsoft/github-copilot-metrics-dashboard-web:v0.1.0-beta.1`
- `ghcr.io/microsoft/github-copilot-metrics-dashboard-collector:v0.1.0-beta.1`

GitHub Release notes include the pushed image digests. Do not rely on a mutable `latest` tag.

### Known limitations and non-claims

- Shared-password dashboard auth is a beta fallback, not OAuth, RBAC, or a production access model.
- Database role creation/grant automation is not included; least-privilege roles remain operator-managed.
- Azure deployment has no migration/bootstrap job or release pipeline step that runs migrations and seed before traffic.
- Azure Monitor alerts, action groups, App Insights request telemetry, and stale-data health contracts are guidance only, not provisioned defaults.
- Backup/restore has not been rehearsed against a non-production environment.
- Private networking, hardened ingress, WAF/front door, custom domains, and enterprise landing-zone policy are not part of the default foundation.
- Collector production guidance remains pinned to `--concurrency 1`; the concurrent dimension-upsert deadlock fix is still P1 hardening work.
- Enterprise endpoint behavior is preview-only; the P0 beta claim is org-scope unless release notes explicitly promote enterprise coverage.
- Delivery Velocity, Engineering Health, and Consumption Patterns remain preview/advanced surfaces, not P0 readiness claims.
- Deferred P2/polish items are not P0/P1 readiness gates: DORA/CI gold completion, p90 lead-time/commit stats, richer agent-session source signals, screenshots/demo GIFs, issue-template config polish, Teams/Tickets, external trackers, Fabric/OneLake, GHAS/Security, and forecasting/anomaly detection.
