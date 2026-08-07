# 08 — Launch Readiness & Priorities

This spec is the canonical launch-readiness and priority taxonomy for the GitHub Copilot Metrics Dashboard. It translates the roadmap in [`./05-roadmap-and-phasing.md`](./05-roadmap-and-phasing.md) into release gates: what MUST be true for OSS beta, what MUST be true before recommending production self-hosting, and what MUST remain hidden until advanced analytics are trustworthy.

The priority labels in this spec are release-readiness labels, not spec numbers or sprint phases. When a navigation, launch, or release decision conflicts with a lower-level roadmap note, this spec controls until the underlying spec is updated.

## Goals

This spec MUST:

- Define stable priority levels for launch decisions: **P0 — OSS Beta / core value-story launch**, **P1 — Production self-host readiness**, and **P2 — Expansion / advanced analytics**.
- Protect the core product thesis: the dashboard MUST tell a defensible value story for GitHub Copilot using time saved, dollars saved, ROI, cost-aware spend, adoption, and PR/delivery evidence.
- Prevent untrusted or unpopulated views from appearing as first-class product surfaces.
- Preserve the Constitution: defensible math, privacy by default, read/write separation, lakehouse-shaped schema, idempotent ingestion, bronze retention, contract-driven development, spec-first changes, transparent methodology, and OSS-first Azure-target deployment.
- Give maintainers a release checklist that is auditable without reading implementation code.

## Non-goals

This spec MUST NOT:

- Redefine formulas, table schemas, API contracts, or chart semantics already owned by [`./01-data-sources-and-model.md`](./01-data-sources-and-model.md), [`./02-value-translation.md`](./02-value-translation.md), [`./03-architecture.md`](./03-architecture.md), [`./04-ui-and-views.md`](./04-ui-and-views.md), [`./06-delivery-and-quality.md`](./06-delivery-and-quality.md), or [`./07-unit-economics.md`](./07-unit-economics.md).
- Promote broad GitHub Advanced Security posture reporting into the Copilot ROI overview. Security metrics MAY ship only when tied to Copilot Autofix, Copilot-assisted remediation, or another explicit Copilot value mechanism.
- Add per-developer metrics, leaderboards, rankings, or surveillance affordances.
- Overbuild forecasting, anomaly detection, or ML narratives before the core value story is trusted.
- Commit to SaaS hosting, phone-home telemetry, or external analytics collection.
- Treat placeholder tabs as launch progress. A stub is documentation, not a first-class view.

## Priority taxonomy

| Priority | Meaning | Release rule | Navigation rule |
| --- | --- | --- | --- |
| **P0 — OSS Beta / core value-story launch** | The smallest trustworthy OSS launch that proves Copilot value with defensible math and realistic demo data. | A beta release MUST NOT ship if any P0 gate fails. | P0 views MAY appear as first-class navigation only when populated, explained, and tested. |
| **P1 — Production self-host readiness** | The operational hardening required before maintainers recommend customer production deployment. | A production-ready release MUST NOT be claimed until P1 gates pass. | P1 views MAY appear as preview or advanced surfaces, but MUST be clearly labeled if source maturity is incomplete. |
| **P2 — Expansion / advanced analytics** | Optional expansion areas that depend on additional data sources, stronger auth, or mature methodology. | P2 work MUST remain out of launch-critical paths until its decision gates pass. | P2 views MUST be hidden, feature-flagged, or absent until data quality, privacy, and methodology gates pass. |

Priority labels apply to **readiness**, not importance. A P2 item can be strategically important, but it MUST NOT distract from a trustworthy P0/P1 launch.

A feature that requires P2-only data MUST NOT be presented as a P0 proof point. A feature that is visually complete but lacks ingestion, tests, methodology, or demo data remains below its target priority until those gates pass.

## P0 — OSS Beta / Core value-story launch

P0 is the public OSS beta. It MUST answer the executive question: **"What did Copilot save us, what did it cost, and can I audit the claim?"**

### P0 scope

The following views are P0 and MAY appear as first-class navigation when their acceptance criteria pass:

- **Overview** — flagship executive value summary.
- **Cost & Spend** — seat, premium-request, AI-credit, and unit-economics spend.
- **Adoption** — active-user and engagement trends.
- **Code Generation** — generated output, language, IDE, feature, and model breakdowns.
- **Pull Requests** — PR creation, merge, review, and delivery evidence already available from the GitHub Copilot Metrics API.
- **Calculator** — standalone value calculator that works without GitHub credentials or a database connection.
- **Settings** — value knobs, privacy controls, ingestion status, and methodology transparency.

Delivery Velocity and Engineering Health are **P1 preview/advanced** surfaces until ingestion maturity and denominator definitions are strong enough for production interpretation. Enterprise-scope endpoint variants MAY be preview configuration, but enterprise-scale rollups, cost centers, and GitHub App source auth are not P0 readiness claims. Tickets, Teams, GitHub Issues, GHAS/Security Health, Jira, Azure DevOps, Linear, Fabric/OneLake, forecasting, and anomaly detection are **P2** and MUST NOT appear as first-class P0 tabs.

### View policy

P0 views MUST follow these rules:

- The Overview MUST be the flagship hierarchy: headline dollars saved, hours saved, ROI/net value, methodology basis, spend-vs-value bridge, adoption context, and PR/delivery evidence.
- Every derived hour, dollar, ROI, and unit-economics number MUST expose a "How is this calculated?" explanation with formulas and current knob values.
- First-class navigation MUST NOT include empty placeholder tabs, stub pages, or "coming soon" pages.
- Empty states inside P0 views MUST be actionable: they MUST explain the missing input and link to the setup or ingestion step that produces it.
- P0 views MUST avoid per-developer ranking and MUST default to pseudonymized identities wherever user-level data is referenced.
- P0 charts MUST distinguish null, unavailable, and zero values. Unavailable denominators MUST render as `—`, not `$0`, `0%`, or misleading flat lines.

### User-visible acceptance criteria

A P0 beta candidate MUST satisfy all of the following:

1. A fresh user can follow the README quickstart and reach a populated demo dashboard without GitHub credentials.
2. A configured user can provide GitHub credentials, run ingestion for at least the supported baseline window, and see the same P0 views populated with real organization data.
3. The Overview answers the value-story question in one screen and links to cost, adoption, code-generation, and PR evidence.
4. Cost & Spend shows total spend, seat cost, premium-request spend, AI-credit spend, and unit economics with null-safe denominators.
5. Adoption shows active-user and engagement health without creating individual performance rankings.
6. Code Generation shows output and breakdowns while disclosing that lines of code are directional, not the sole value measure.
7. Pull Requests shows Copilot-authored, Copilot-reviewed, merged, and time-to-merge evidence without overstating causality.
8. Calculator works standalone and uses the same value methodology as the dashboard.
9. Settings exposes value knobs, privacy posture, ingestion status, and methodology controls.
10. No hidden external telemetry, SaaS dependency, or phone-home behavior is required for P0.

### Demo requirements

The demo seed MUST:

- Populate at least 90 days of realistic `demo-org` data across all P0 views.
- Include adoption, code-generation, PR, spend, AI-credit, value, ROI, and unit-economics data that form a coherent story.
- Use the same silver/gold semantics as real ingestion, even when the demo path bypasses GitHub APIs.
- Include enough variation to exercise trends, breakdowns, null-safe denominator handling, and methodology explanations.
- Be deterministic and safe to re-run without duplicating facts.
- Be clearable without deleting customer data.
- Avoid synthetic per-developer leaderboards or surveillance-flavored examples.

### OSS artifacts

A P0 OSS beta MUST include and link from the README as appropriate:

- `LICENSE`.
- `CONTRIBUTING.md`.
- `SECURITY.md`.
- `CODE_OF_CONDUCT.md`.
- Issue templates for bug reports, feature requests, and documentation gaps.
- A pull request template with a Constitution/spec check.
- `.env.example` with safe defaults and no secrets.
- Privacy and authentication documentation that explains credentials, pseudonymization, read/write separation, and data retention.
- A README quickstart for both demo mode and real-data mode.
- A real-account onboarding guide that explains the safe GitHub organization test flow: demo first, temporary classic PAT scopes, collector-only credential handling, config/token preflight checks, short-window backfill, and app verification steps.

### CI and release gates

A P0 beta release MUST pass these gates:

- Dependency installation succeeds from a clean clone.
- Typecheck, lint, test, and build jobs pass in CI.
- Database migrations apply to a fresh Postgres instance.
- Demo seed smoke test populates every P0 view without first-class stubs.
- Collector configuration smoke test validates required environment wiring without leaking credentials.
- README quickstart is executable by a new contributor.
- Release notes identify any known P0 limitations and MUST NOT claim production readiness unless P1 also passes.

### P0 exit criteria

P0 is complete when:

- Every P0 view satisfies the user-visible acceptance criteria above.
- No P1/P2 view appears as a first-class empty tab.
- Demo mode tells the same value story as real-data mode.
- The public repo has the OSS artifacts required above.
- CI proves typecheck, lint, test, build, migration, and demo smoke health.
- The README clearly states beta status, setup path, privacy posture, and known limitations.
- Release notes identify whether real-data P0 support is org-scope only or includes explicitly validated enterprise preview behavior.

## P1 — Production self-host readiness

P1 is the hardening layer required before maintainers recommend the project for customer-controlled production deployment. P1 MUST preserve the P0 value story while making installation, operation, recovery, and security credible for self-hosted environments.

### Authentication and authorization

A P1 release MUST provide either real auth or a hardened shared-password fallback. The chosen model MUST:

- Protect all dashboard views except explicitly public calculator surfaces.
- Store secrets outside source code and container images.
- Support secure session handling, rotation, and documented reset procedures.
- Gate Settings/admin mutations to authenticated shared-password or identity-header users; when role-aware admin is not implemented, require upstream role/group enforcement for `/settings` and `/api/settings/*`.
- Document the risk trade-off if shared-password auth remains available.
- Treat identity-aware ingress/OIDC, such as Microsoft Entra ID or another OIDC-compatible gateway/proxy, as the recommended production path until native dashboard OAuth/RBAC exists.
- Support an explicit `AUTH_MODE` posture: `open` for local/demo or externally protected deployments, `shared-password` for the beta fallback, and `identity-header` for trusted upstream identity headers.
- Trust identity headers only when `AUTH_MODE=identity-header`; operators MUST ensure the upstream identity-aware ingress authenticates users, strips spoofed client-supplied identity headers, and injects the configured trusted header.
- Warn in the dashboard UI when auth resolves to `open` because the app itself is public to anyone who can reach the web URL, and reject Settings mutations in this mode.
- Preserve read/write separation: the web app MUST NOT receive outbound GitHub credentials.

GitHub App authentication MAY be delivered in P2 for enterprise source access, but P1 MUST still have a production-credible dashboard access model.

### Deployment topology

A P1 deployment topology MUST include production artifacts for:

- Azure Container Apps for the web app.
- Azure Container Apps Job, scheduled job, or equivalent controlled runner for the collector.
- Azure Database for PostgreSQL Flexible Server.
- Azure Key Vault for secrets.
- Azure Log Analytics for logs and diagnostics.
- Managed identity or least-privilege secret access where available.
- Separate database roles for read-only web access and collector write access.
- Documented environment variables, sizing assumptions, and single-region defaults.

The topology SHOULD remain runnable locally through docker compose, but production guidance MUST target Azure first.

### Observability

P1 MUST include operational visibility for both web and collector components:

- Health and readiness endpoints for the web app.
- Collector run status, duration, row counts, checkpoint state, error summaries, and stale-data freshness through the health contract or documented operational queries.
- Structured logs with no tokens, raw credentials, or sensitive payloads.
- Log Analytics queries or dashboards for failed ingestion, stale data, migration failures, and web availability.
- Alerting guidance for failed scheduled runs, repeated API errors, storage exhaustion, and stale gold data.

### Backup and restore

P1 MUST document and test recovery paths:

- Postgres automated backup configuration, retention, and point-in-time restore expectations.
- Bronze retention location, default retention, and replay expectations.
- Restore runbook for database loss, partial ingestion failure, and bad knob/methodology rollout.
- Migration rollback or forward-fix posture.
- Export and archive guidance for customers that need external retention.
- Non-production restore rehearsal evidence using [`../docs/restore-rehearsal.md`](../docs/restore-rehearsal.md) or an equivalent completed record.

A P1 release MUST NOT claim production readiness until restore has been exercised against a non-production environment.

### Operations

P1 operations MUST cover:

- Deployment pipeline from source/tag to Azure resources.
- Image publishing and versioning.
- Secret rotation for GitHub credentials, auth secrets, and database credentials.
- Backfill and daily schedule procedures.
- Rate-limit and retry behavior.
- Upgrade procedure for schema migrations and value recomputation.
- Runbooks for stuck ingestion, failed gold rebuild, expired credentials, and database connectivity failure.
- Documented support boundaries for OSS users.

### P1 exit criteria

P1 is complete when:

- A maintainer can deploy a tagged release to Azure from clean infrastructure using documented artifacts.
- Dashboard auth is production-credible or the hardened fallback risk is explicitly documented.
- Web and collector health are observable through documented checks and logs.
- Scheduled collector operation is configured and recoverable.
- Database backup and restore are documented and tested.
- Secrets live in Key Vault or an equivalent secret store, not in code or images.
- Web/database read-only access and collector write access are separated.
- Deployment, upgrade, and incident runbooks exist.

## P2 — Expansion / advanced analytics

P2 contains advanced analytics and integration work that can expand the product after P0 trust and P1 operations are established. P2 work SHOULD be feature-flagged, hidden, or absent until its decision gates pass.

### Issues, tickets, and teams

GitHub Issues, Tickets, and Teams MAY ship only when they satisfy these gates:

- Source ingestion is idempotent, checkpointed, and bronze-retained where raw source bytes are available.
- Silver/gold tables preserve lakehouse-shaped grains and stable surrogate keys.
- Cycle-time, throughput, and delivery-delta metrics have explicit formulas and minimum sample thresholds.
- Team scorecards enforce privacy thresholds and MUST NOT expose per-developer ranking.
- Demo data covers the views without implying causality that the methodology cannot defend.

### Security and GitHub Advanced Security

Security Health MAY ship only as an optional module. It MUST NOT become a broad GHAS clone. Security metrics MUST be tied to Copilot value, such as Copilot Autofix-assisted remediation, time-to-remediate deltas where defensible, or cost/value of Copilot-assisted security workflows.

Dependabot and GHAS signals MAY support this module, but they MUST NOT be rolled into Copilot ROI unless the displayed metric is explicitly tied to Copilot-assisted detection, remediation, review, or Autofix value.

A security view MUST include clear scope language explaining what is and is not measured.

### Fabric and OneLake

Fabric/OneLake support MAY ship when:

- Silver and gold tables map mechanically to lakehouse/delta tables.
- Writes are idempotent and recoverable.
- Bronze retention and replay semantics are preserved or explicitly documented for the lake target.
- Power BI or Fabric semantic-model examples do not require schema drift from the Postgres source of truth.
- Customer data remains in customer-controlled infrastructure.

### Non-GitHub trackers

Azure DevOps, Jira, Linear, and other trackers MAY ship when:

- Each adapter has documented auth, rate-limit, pagination, and retry behavior.
- A common ticket schema avoids source-specific leakage into user-facing formulas.
- The value methodology distinguishes GitHub-native PR evidence from tracker-derived delivery evidence.
- Customers can disable each tracker independently.

### Forecasting and anomaly detection

Forecasting and anomaly detection MAY ship only after core historical reporting is trusted. These features MUST:

- Explain required history length and confidence limits.
- Avoid presenting projections as audited savings.
- Distinguish linear projection, threshold alerting, and statistical anomaly detection.
- Link every alert back to raw measures and methodology notes.

### P2 decision gates

A P2 feature MAY become visible only when:

- Its source data is ingested idempotently and retained for replay where applicable.
- Its user-facing metrics are defined in specs with formulas, denominators, thresholds, and caveats.
- Its privacy impact is reviewed against the Constitution.
- Its demo data is realistic and exercises both healthy and edge-case states.
- Its contracts, migrations, tests, and docs are complete.
- Its presence does not weaken the P0 Overview value story.

## View priority matrix

| View or capability | Priority | Default visibility | Primary dependency | Readiness rule |
| --- | --- | --- | --- | --- |
| Overview | P0 | First-class landing page | Gold value/ROI facts, org facts, PR facts, billing facts | MUST present the flagship value hierarchy with formulas and methodology basis. |
| Cost & Spend | P0 | First-class tab | Billing usage, AI credits, unit economics | MUST show spend categories and null-safe unit costs. |
| Adoption | P0 | First-class tab | Copilot Metrics API org/user aggregates | MUST show aggregate engagement without surveillance affordances. |
| Code Generation | P0 | First-class tab | Feature, language, IDE, and model breakdowns | MUST disclose that output is directional and not the sole value measure. |
| Pull Requests | P0 | First-class tab | PR metrics from the Copilot Metrics API | MUST support the delivery estimator without overstating causality. |
| Calculator | P0 | First-class public surface | Pure value engine and URL inputs | MUST work without database or GitHub credentials. |
| Settings | P0 | First-class authenticated surface | Settings, ingestion status, privacy controls | MUST expose knobs, privacy posture, and methodology controls. |
| Delivery Velocity | P1 | Preview or advanced only | Mature PR/issue delivery evidence | MUST NOT appear as a launch-critical view until denominators and baselines are defensible. |
| Engineering Health | P1 | Preview or advanced only | Quality, delivery, and operational signals | MUST NOT imply broad engineering-health coverage before source maturity exists. |
| Consumption Patterns | P1 | Preview or advanced only | User facts, user model facts, team bridge, AI-credit model spend | MUST enforce team-size and cohort privacy thresholds, expose only cohort/team/model aggregates, and render AI-credit billing as unavailable when not ingested; no public per-developer leaderboard or selected-user drilldown. |
| Tickets / GitHub Issues | P2 | Hidden until ready | Issue ingestion and cycle-time methodology | MUST pass ticket-source, privacy, sample-size, and demo gates. |
| Teams | P2 | Hidden until ready | Team membership bridge and team gold facts | MUST enforce team-size thresholds and avoid per-developer rankings. |
| Dependabot / GHAS / Security Health | P2 | Optional hidden module | Dependabot, GHAS, or security APIs plus Copilot value linkage | MUST be scoped to Copilot-assisted value, not generic security posture. |
| Jira / Azure DevOps / Linear | P2 | Hidden adapters | External tracker APIs | MUST satisfy adapter, auth, schema, and methodology gates. |
| Fabric / OneLake | P2 | Backend/export capability | Lakehouse writer and Fabric/Power BI artifacts | MUST preserve lakehouse-shaped schema and idempotent writes. |
| Forecasting / anomaly detection | P2 | Hidden insights | Sufficient historical data and alert methodology | MUST explain confidence limits and avoid audited-savings claims. |

## Readiness gate checklist

A release MUST NOT claim a readiness level unless the corresponding checklist is complete or any exception is explicitly documented in release notes.

### P0 checklist

- [x] Overview has the flagship hierarchy for dollars saved, hours saved, ROI/net value, methodology basis, spend, adoption, and PR evidence.
- [x] No empty or stub first-class tabs are present.
- [x] Overview, Cost & Spend, Adoption, Code Generation, Pull Requests, Calculator, and Settings are populated by demo data.
- [x] Demo seed is realistic, deterministic, clearable, and safe to re-run.
- [x] Every derived metric has a formula and current knob explanation.
- [x] Calculator works without database or GitHub credentials.
- [x] Privacy defaults avoid per-developer ranking and pseudonymize user identities where applicable.
- [x] `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue templates, and pull request template exist.
- [x] CI passes typecheck, lint, test, build, migration, collector configuration smoke, demo smoke, and Docker image build smoke.
- [x] README quickstart covers demo and real-data paths.
- [x] Privacy/auth documentation explains credentials, retention, pseudonymization, and read/write separation.

### P0 beta signoff (2026-07-01)

`v0.1.0-beta.1` is signed off for the P0 OSS beta scope with org-scope real-data support. No P0 checklist exceptions are carried for this beta; known limitations are P1/P2 limitations and are documented in [`../CHANGELOG.md`](../CHANGELOG.md). This signoff MUST NOT be interpreted as P1 production self-host readiness.

### P1 checklist

A checklist item remains unchecked until the release has been validated end-to-end or an exception is explicitly documented in release notes. The artifact index below records what now exists; it does not by itself authorize a production-readiness claim.

- [ ] Azure deployment artifacts cover Container Apps web, scheduled collector, Postgres Flexible Server, Key Vault, and Log Analytics.
- [ ] Dashboard auth is production-credible or hardened shared-password fallback risk is documented.
- [ ] Secrets are stored outside source code and container images.
- [ ] Web read-only database access is separated from collector write access.
- [ ] Health/readiness checks exist and are documented.
- [ ] Collector run status, checkpoints, failures, and stale data are observable.
- [ ] Backup and restore runbooks exist and restore has been tested in non-production.
- [ ] Deployment, upgrade, secret-rotation, and incident runbooks exist.
- [ ] Deployment pipeline publishes versioned images and deploys a tagged release.

### Current P1 artifact index (2026-07-03)

The P1 docs and Azure foundation now make the self-host readiness path discoverable. They narrow documentation and infrastructure gaps, but P1 production self-host readiness still depends on the checklist above.

| Artifact | Exists now | Still blocks production-readiness claim |
| --- | --- | --- |
| Authentication posture | [`../docs/auth.md`](../docs/auth.md) documents the beta shared-password behavior, public routes, risk trade-off, recommended identity-aware deployment layer, and secret/credential rotation. | A production-credible dashboard auth decision, implementation, or accepted hardened-fallback risk posture still needs maintainer validation; role-aware admin gating remains future work if roles are introduced. |
| Observability guidance | [`../docs/observability.md`](../docs/observability.md) documents `/api/health`, `ingestion_run`, status SQL, alert recommendations, KQL examples, and logging do/don't guidance. | Azure Monitor alert rules, action groups, dashboards, ingestion-run export to Log Analytics, external availability checks, and stale-data health contracts are not provisioned defaults. |
| Operations runbook | [`../docs/production-runbook.md`](../docs/production-runbook.md) documents deployment order, migration/bootstrap job execution, upgrade, daily collection, backfill, secret rotation, backup/restore, and common incidents. | Clean tagged-release deployment, migration/bootstrap execution in a real Azure rollout, restore rehearsal, and bronze replay/PITR drills remain unverified gates. |
| Restore rehearsal evidence template | [`../docs/restore-rehearsal.md`](../docs/restore-rehearsal.md) records non-production environment, timestamps, dataset, PITR target, bronze replay/backfill command, validation checks, failure notes, and signoff. | The template is not completed evidence. A successful non-production PITR and bronze replay/backfill rehearsal still needs to be run, reviewed, and accepted before the P1 restore gate can pass. |
| Database role bootstrap | [`../infra/postgres/bootstrap-roles.sql`](../infra/postgres/bootstrap-roles.sql) documents repeatable least-privilege grants for `web_readonly`, `collector_writer`, and `migration_admin`, with runbook guidance for passing resulting DB URLs. | Role bootstrap remains operator-run SQL. Bicep and release pipelines do not yet execute it end-to-end or verify grants automatically, so P1 DB role separation is not complete. |
| Azure Bicep foundation | [`../infra/bicep/README.md`](../infra/bicep/README.md) and [`../infra/bicep/main.bicep`](../infra/bicep/main.bicep) cover the minimal single-region Azure foundation, including a manual migration/bootstrap Container Apps Job that uses the migration DB URL secret. | Private networking or hardened ingress, DB role bootstrap automation, tagged Azure deployment automation, provisioned alerting, validated migration job execution, and enterprise landing-zone policy remain hardening work. |

### Current P1 infrastructure foundation status (2026-07-03)

The `p1-azure-bicep-foundation` work replaces the earlier prototype with a clearer single-region Bicep foundation. This narrows the infrastructure gap but does **not** complete P1 production self-host readiness; the checklist above remains authoritative. Several rows below were superseded by the later `p1-hardening-iteration` scorecard in this spec (azd deploy, automated role bootstrap, provisioned alerts, Entra auth, and the collector concurrency fix); where they differ, the scorecard is current.

| Area | Foundation now covers | Remaining P1 gap |
| --- | --- | --- |
| Azure template presence | `infra/bicep/main.bicep` is resource-group scoped, parameterized by prefix/environment/location/image refs/sizing/secrets, and provisions ACR, Log Analytics, Container Apps environment, Postgres Flexible Server, Key Vault, storage, separate web/migration/collector identities, web Container App, manual migration/bootstrap job, and scheduled collector job. | The template remains single-region and intentionally simple. Private networking, custom domains, WAF/front door, Entra/OIDC app auth, and enterprise landing-zone policy are still outside this foundation. |
| Container images | Web and collector image references are explicit parameters, with a created ACR fallback using `ghcp-web:<imageTag>` and `ghcp-collector:<imageTag>`. CI build-smokes both Dockerfiles locally, the web app emits Next.js standalone output for the web image, and `.github/workflows/release.yml` publishes tag/commit-addressed GHCR images for web and collector on `v*` tags. | The release workflow does not deploy to Azure, run environment approvals, or mirror images into a customer ACR. Azure rollout remains operator-driven using explicit image refs or the ACR fallback. |
| Secret injection | Runtime secrets are stored in Key Vault and referenced by Container Apps using workload managed identities. The collector receives the GitHub PAT; the web app does not. Dashboard password and database URL secrets are wired. | Raw secret values are still supplied as secure deployment parameters or external DB URL overrides. External existing-secret flows and automated rotation workflows remain documented/operator-driven rather than fully automated. |
| Database roles | The template can accept separate `webDatabaseUrl`, `collectorDatabaseUrl`, and `migrationDatabaseUrl` secret values, and stores non-secret names/URIs as outputs. `infra/postgres/bootstrap-roles.sql` provides repeatable operator-run role creation and grants for `web_readonly`, `collector_writer`, and `migration_admin`. | Database role creation/grant automation is not implemented. If URL overrides are not supplied, generated admin URLs are used as a bootstrap caveat and MUST NOT be treated as final P1 least privilege. Operators must rerun the bootstrap SQL after migrations until pipeline automation exists. |
| Scheduled collector | A Container Apps Job runs the collector on a parameterized cron, sets `BRONZE_DIR`, mounts durable Azure Files storage, injects GitHub token via Key Vault, and defaults `--concurrency 4` (safe via the dimension advisory lock). | Manual backfill/config-check jobs are not provisioned. Recovery still depends on operator runbooks and CLI execution. |
| Migrations | A manual Container Apps Job uses the collector image by default, reads the `migration-database-url` Key Vault secret through a separate managed identity, and runs the packaged DB migration runner followed by the production-safe seed. A root `pnpm db:bootstrap` script provides the equivalent trusted-runner fallback. | The `azd` postprovision hook now runs `infra/postgres/bootstrap-roles.sql`, migrations, and the production-safe seed with grant verification. End-to-end execution in a tagged-release Azure rollout with approvals still needs validation, and operators must confirm it before web traffic or scheduled collection. |
| Health/readiness | Web Container App probes target `/api/health`; Log Analytics captures Container Apps stdout/stderr. | There is no external availability test, App Insights request telemetry, stale-data health contract, or collector health endpoint beyond job status/logs/`ingestion_run`. |
| Observability | The foundation provisions Log Analytics and keeps documented KQL/runbook guidance in `docs/observability.md`. | Alert rules, action groups, dashboards, ingestion-run export to Log Analytics, and Postgres/storage pressure alerts are not provisioned. |
| Backups and runbooks | Postgres backup retention is parameterized; the collector has durable bronze storage via Azure Files. `infra/bicep/README.md` documents deployment, required params, limitations, and secret rotation; `docs/production-runbook.md` documents deployment, upgrade, backfill, restore, and incident procedures; `docs/restore-rehearsal.md` provides a blank evidence template. | Backup/restore has not been exercised. Bronze retention cleanup/archive policy, PITR rehearsal, and failed-run restore drills remain P1 exit criteria. |

#### Follow-up after `p1-azure-bicep-foundation`

Before Copilot Metrics Dashboard can claim P1 production self-host readiness, maintainers MUST still add or validate the following. **(done)** items are complete; **(artifact complete)** items are implemented but still require live validation in a real Azure rollout; **(open)** items are not yet built.

- Database role bootstrap automation — **(artifact complete)**. The `azd` postprovision hook ([`../infra/hooks/postprovision.sh`](../infra/hooks/postprovision.sh)) creates `web_readonly`, `collector_writer`, and `migration_admin`, writes least-privilege URLs to Key Vault, refreshes grants after migration, and verifies each role's privileges. Live validation in Azure remains.
- Migration/bootstrap execution before traffic — **(artifact complete)**. The same postprovision hook runs Drizzle migrations and the production-safe seed as `migration_admin`, and `azd` runs it automatically before deploy. Validated execution in a tagged-release deployment remains.
- Private networking/VNet integration or a documented hardened ingress pattern — **(open)**. The foundation intentionally uses public Container Apps ingress with a documented hardened-ingress pattern; private endpoints/VNet are not built.
- Azure Monitor alert rules/action groups — **(artifact complete)**. Provisioned in [`../infra/bicep/main.bicep`](../infra/bicep/main.bicep) behind `enableAlerts` (failed collector runs, stale ingestion, migration failure, GitHub API errors, web readiness, Postgres CPU/storage, storage capacity) plus an `/api/health` availability test behind `enableAvailabilityTest`. Thresholds/receivers are environment-tuned.
- Tagged Azure deployment automation from immutable image tags or digests — **(open)**. `azd up` deploys, but a tagged-release pipeline with approvals and digest pinning is not yet wired.
- Collector concurrency hardening — **(done)**. Dimension upserts are serialized by a Postgres transaction-scoped advisory lock (`DIMENSION_ADVISORY_LOCK_KEY`) plus an in-process gate, with a live-DB regression test; default concurrency is 4.
- Completed and accepted restore rehearsal — **(open)**. Restore scripts ([`../scripts/restore/`](../scripts/restore/)) and a step-by-step procedure exist, but a completed, reviewed non-production Postgres PITR + bronze-replay rehearsal record is still required.
- Production-credible dashboard access control — **(artifact complete)**. Azure Container Apps built-in auth with Microsoft Entra ID is wired (`enableEntraAuth`), consumed via `identity-header` mode; shared-password remains a documented fallback. Maintainer acceptance and live validation remain.

#### P1 readiness scorecard after `p1-hardening-iteration` (2026-07-03)

This iteration completed the P1 code/infra/runbook artifacts. Per the checklist rules above, the P1 boxes remain unchecked until each item is validated end-to-end in a real Azure deployment. Production self-host readiness MUST NOT be claimed until the validation-pending gates pass.

| P1 gate | Artifact status | Validation-pending before P1 claim |
| --- | --- | --- |
| Deploy automation | `azd` (`azure.yaml`, `../infra/main.bicep` subscription wrapper, hooks) builds/pushes images, provisions, and deploys. | Clean tagged-release rollout with approvals and digest pinning executed against Azure. |
| DB role separation | Automated by the postprovision hook with grant verification. | Verified in a real rollout; not yet release-pipeline gated. |
| Dashboard auth | Entra built-in auth wired; `identity-header` consumption; shared-password fallback; open-mode safe-by-default. | Maintainer acceptance plus validated Entra sign-in against a deployed app. |
| Observability/alerts | Action group + eight alert rules + `/api/health` availability test provisioned (toggle-gated); ingestion-run log signal emitted. | Alerts firing verified in a live workspace; thresholds tuned. |
| Collector concurrency | Advisory-lock fix + live-DB regression test; default concurrency 4. | None (complete). |
| Backup/restore | PITR + bronze-replay scripts and a step-by-step rehearsal procedure. | A completed, reviewed non-production restore rehearsal record. |
| Private networking | Documented hardened-ingress pattern (public ingress). | Optional private endpoints/VNet for high-sensitivity deployments. |

#### Production / open-source readiness hardening (2026-07-05)

A post-review hardening pass closed OSS + security + DX gaps found after the P1 artifacts landed.
This does not by itself change the P1 gate status; live-Azure validation remains pending.

| Area | Done | Notes / still operator-executed |
| --- | --- | --- |
| Dependency vulnerabilities | `drizzle-orm` upgraded to `>=0.45.2` (fixes GHSA-gpj5-g38j-94v9); `postcss` pinned `>=8.5.10` via a pnpm override. `pnpm audit` is clean. | Kept current via Dependabot + a CI audit gate. |
| CI security | CI runs `pnpm audit --audit-level=high`; added a CodeQL code-scanning workflow and a DB-backed collector concurrency test. | GitHub secret scanning + push protection are repo settings to enable (see [`../docs/security-prerelease-checklist.md`](../docs/security-prerelease-checklist.md)). |
| Deploy automation | [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) deploys tagged releases to Azure via GitHub OIDC + `azd`, gated by a `production` environment approval. | Requires one-time OIDC/federated-credential setup; full rollout validation is an operator task. |
| OSS hygiene | Added `CODEOWNERS`, issue-template `config.yml`, `SUPPORT.md`, `.github/dependabot.yml`, and a pre-publish secret-sweep checklist. | Screenshots are generated from the demo app per [`../docs/images/README.md`](../docs/images/README.md). |
| DX / local run | `output: 'standalone'` is env-gated (`BUILD_STANDALONE=1` for Docker) so local `next build && next start` works cleanly; `pnpm db:migrate` root-`.env` loading verified. | — |
| Infra ops | Collector Container Apps Job gets an `az containerapp job update` postdeploy fallback; `bootstrap-roles.sql` has an opt-in legacy-ownership reassignment path. | — |

Validation: `pnpm -r typecheck | lint | test` (141 tests, live DB), `pnpm -r build` (including the
`BUILD_STANDALONE=1` Docker path), and `az bicep build` all pass.

### P2 checklist

- [ ] DORA/CI gold completion, p90 lead-time or PR-cycle-time stats, and commit stats are kept out of P0 navigation and Overview proof points until source, formula, sample-size, demo, contract, and test gates pass.
- [ ] Richer agent-session source signals are documented before they replace or augment the conservative P0 active-agent user-day proxy.
- [ ] Issues/tickets ingestion has idempotent checkpoints, source retention, formulas, and sample thresholds.
- [ ] Teams views enforce privacy thresholds and avoid individual ranking.
- [ ] GitHub App authentication or equivalent enterprise auth is documented before enterprise-scale source ingestion, cost centers, or enterprise readiness claims are promoted.
- [ ] Dependabot/GHAS security modules are scoped to Copilot-assisted value and do not duplicate broad security posture reporting.
- [ ] Fabric/OneLake writer preserves silver/gold table semantics and idempotent replay.
- [ ] Jira, Azure DevOps, Linear, or other tracker adapters have documented auth, retries, rate limits, and common schema mapping.
- [ ] Forecasting/anomaly features explain confidence limits and are not presented as audited savings.
- [ ] Screenshots/demo GIFs and issue-template configuration polish are treated as release polish, not P0/P1 readiness gates.
- [ ] P2 views remain hidden until demo data, methodology, tests, contracts, and docs pass their decision gates.

### Current deferred expansion/polish tracker (2026-07-01)

These tracked items MUST NOT block P0 OSS beta or P1 production self-host readiness unless this spec is amended to promote a specific gate:

| Deferred item | Guardrail |
| --- | --- |
| DORA/CI gold completion, p90 lead time, and commit stats | Keep Delivery Velocity and Engineering Health as preview/advanced or hidden surfaces until ingestion, formulas, sample thresholds, demo data, contracts, tests, and docs pass. Do not use them as P0 Overview proof points. |
| Agent-session source signal | P0 may use the conservative active-agent user-day proxy; richer source-attributed session signals require documented source fidelity and methodology before promotion. |
| Screenshots/demo GIF | Treat as README/marketing polish only; absence MUST NOT block P0/P1 readiness. |
| Issue-template config polish | Required issue templates already satisfy P0 hygiene; extra chooser/configuration polish is deferred. |
| Teams, Tickets, and GitHub Issues | Keep hidden or feature-flagged until ticket/team ingestion, privacy thresholds, formulas, sample-size gates, and demo coverage pass. |
| External trackers | Azure DevOps, Jira, Linear, and similar adapters require documented auth, retries, rate limits, common schema mapping, and independent enable/disable controls. |
| Fabric/OneLake and Power BI | Remain backend/export expansion until lakehouse writes are idempotent, replayable, and schema-compatible with Postgres silver/gold. |
| GHAS/Security modules | Optional only when scoped to Copilot-assisted value; never a broad security posture clone or generic ROI input. |
| Forecasting/anomaly detection | Hidden until history requirements, confidence limits, thresholds, and audited-savings caveats are documented. |

## Open questions

- **P1 auth default (resolved 2026-07-03):** Identity-aware ingress/OIDC is sufficient for the first production-ready release; native in-app dashboard OAuth/RBAC is deferred to P2. The recommended production path is Azure Container Apps built-in authentication (Microsoft Entra ID), consumed by the app in `identity-header` mode and wired in [`../infra/bicep/main.bicep`](../infra/bicep/main.bicep) behind `enableEntraAuth`. Shared-password remains a documented fallback behind an identity-aware layer, and `AUTH_MODE=open` is acceptable only for localhost or fully network-isolated deployments where the network boundary is the control. See [`../docs/auth.md`](../docs/auth.md).
- **P1 preview boundary:** SHOULD Delivery Velocity and Engineering Health remain P1 preview, or move fully to P2 until issue/ticket ingestion is mature?
- **Sample thresholds:** What minimum sample sizes are required before cycle-time deltas, ticket throughput comparisons, or security remediation deltas can appear outside preview?
- **Tracker sequence:** After GitHub Issues, SHOULD Azure DevOps, Jira, or Linear be the first non-GitHub tracker adapter?
- **Security scope:** Which Copilot Autofix or GHAS fields are sufficiently available and auditable to support a Copilot-specific security value story?
