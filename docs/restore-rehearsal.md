# Restore rehearsal procedure and evidence template

Use this guide to rehearse Copilot Metrics Dashboard recovery in an **isolated non-production** environment. This document is a procedure plus a blank evidence template; it does **not** claim a rehearsal has been performed. A P1 restore-readiness gate is satisfied only after an operator runs the drill, records sanitized evidence, and obtains review acceptance.

Do not include secrets, raw connection strings, GitHub tokens, raw bronze payloads, or customer confidential data in completed evidence. Link to sanitized logs or internal tickets instead.

## Scope

The restore drill covers:

1. Azure Database for PostgreSQL Flexible Server point-in-time restore (or geo-restore) into a **new** server.
2. Reconnection of non-production app/job configuration to the restored database.
3. Bronze retention check plus idempotent collector backfill for the selected recovery window.
4. Gold rebuild and web `/api/health` validation.
5. Evidence capture for RTO, RPO, row counts, data freshness, and follow-up issues.

## Prerequisites

- A non-production Azure subscription/resource group or clearly isolated non-production resource group.
- Operator access to run `az postgres flexible-server restore` or `geo-restore` on the source server and create a new target server.
- A source Flexible Server with automated backups/PITR enabled and known backup retention.
- A durable bronze location, normally the Azure Files share mounted as `BRONZE_DIR` for the collector.
- A trusted runner with `az`, `psql`, `curl`, Node 20+, pnpm 10, and repository dependencies installed.
- Non-production secrets only: restored `DATABASE_URL`, `GITHUB_TOKEN`, `GITHUB_ORGS` or `GITHUB_ENTERPRISE`, and web app URL.
- No production writes: scripts require `RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server` and must point only at restored/non-production targets.

## Procedure

### 1. Select the restore point and freeze evidence inputs

Record the target timestamp in UTC, the reason for selecting it, the source server/database identifier, current backup retention, source web/collector image tags, and the intended replay/backfill window. Capture baseline row-count and latest-success queries from the source or a sanitized pre-drill export if policy allows.

### 2. Restore Postgres to a new server

Run from the repository root or another trusted shell with Azure CLI access:

```bash
export SOURCE_RESOURCE_GROUP=<source-rg>
export SOURCE_SERVER_NAME=<source-flex-server>
export TARGET_RESOURCE_GROUP=<non-prod-target-rg>
export TARGET_SERVER_NAME=<new-non-prod-flex-server>
export RESTORE_TIME_UTC=<YYYY-MM-DDTHH:MM:SSZ>
export RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server

scripts/restore/postgres-pitr-restore.sh
```

For a geo-restore drill, set `RESTORE_MODE=geo` and `LOCATION=<target-region>` instead of `RESTORE_TIME_UTC`. The script refuses to run when the target server already exists or matches the source name.

### 3. Prepare the restored application configuration

Create or update only non-production Key Vault secrets, Container App settings, or local environment variables so the web app, collector, and migration runner point at the restored database. Do not change production secrets. If the restored point predates the currently deployed schema baseline, run the normal migration/bootstrap path with the migration/admin URL before application validation:

```bash
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:bootstrap
```

After migrations, refresh database grants using the established operator process for `web_readonly`, `collector_writer`, and `migration_admin` roles.

### 4. Validate bronze retention and run idempotent backfill

The collector currently exposes idempotent `backfill`, not a separate offline bronze-only replay command. The script below verifies retained bronze files exist under `BRONZE_DIR`, then backfills the selected window into the restored database. Re-running the same window is safe because ingestion is checkpointed in `ingestion_run` and silver writes use conflict-aware upserts.

```bash
export DATABASE_URL=<restored-non-prod-collector-url>
export GITHUB_TOKEN=<non-prod-or-approved-drill-token>
export GITHUB_ORGS=<org-slug-list>
export BRONZE_DIR=<mounted-or-restored-bronze-path>
export FROM_DATE=<yyyy-mm-dd>
export TO_DATE=<yyyy-mm-dd>
export RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server

scripts/restore/bronze-replay-backfill.sh
```

Use `WITH_DELIVERY=true` only when the drill includes preview delivery sources and the token has the required repo scope. Keep `CONCURRENCY=1` unless the known dimension-upsert concurrency issue has been resolved and validated.

### 5. Validate restored data and web readiness

Run the validation script against the restored database and non-production web endpoint:

```bash
export DATABASE_URL=<restored-non-prod-collector-or-validation-url>
export GITHUB_TOKEN=<non-prod-or-approved-drill-token>
export GITHUB_ORGS=<org-slug-list>
export WEB_BASE_URL=https://<non-prod-web-host>
export RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server

scripts/restore/validate-restore.sh
```

The script records counts for key dimension, ingestion, silver, cost, and gold tables; rebuilds gold using the collector `gold` command; and requires `/api/health` to return readiness `ok` with `staleDataStatus: "fresh"`. Record the output, exit codes, and sanitized log links in the evidence section.

### 6. Review and clean up

Compare observed RTO/RPO and row counts to the expectations captured before the drill. Record any gaps, failed commands, or manual interventions. After review, remove or lock down non-production restored resources according to retention policy; do not reuse the restored server as production.

## Migration rollback and forward-fix posture

Copilot Metrics Dashboard uses Drizzle migrations from `packages/db/drizzle/*.sql`, executed by `pnpm db:migrate` or the root `pnpm db:bootstrap` script (`db:migrate` plus production-safe `db:seed`). Migrations are versioned in source control and tracked by Drizzle migration metadata in the database. There are no documented down migrations.

Preferred posture is **forward-fix**: pause the collector schedule, keep web traffic closed or degraded, diagnose the failed migration, add a new corrective migration or code fix, rerun the migration/bootstrap job, refresh grants, rebuild gold if needed, and smoke `/api/health`. Forward-fix preserves auditability and avoids losing successful ingestion work.

Use PITR rollback only when a migration corrupts data or leaves the schema unusable. Restore Postgres to the pre-upgrade timestamp into a new non-production or replacement target, redeploy the previous tagged web/collector images, refresh secrets and grants, run `collect --check`, then backfill missed days. Never use `pnpm db:seed:reset` as a migration rollback; it wipes facts and `ingestion_run`.

Bad knob or methodology rollout is handled at the settings/value layer first: restore the prior setting value from evidence or backup, redeploy the previous value-engine code if required, and rerun `pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold`. If persisted gold rows are wrong but silver is intact, rebuild gold rather than restoring the whole database. Use PITR only when settings history/evidence is insufficient or broader data corruption occurred.

---

# Evidence template

The sections below are intentionally blank for the operator to complete after a real non-production drill.

## Rehearsal metadata

| Field | Value |
| --- | --- |
| Rehearsal ID | `<YYYY-MM-DD-env-or-ticket>` |
| Environment | `<non-production environment name, subscription/account, region>` |
| Production isolation confirmed? | `<yes/no; describe isolation controls>` |
| Operator | `<name or handle>` |
| Reviewer / approver | `<name or handle>` |
| Started at (UTC) | `<YYYY-MM-DDTHH:MM:SSZ>` |
| Completed at (UTC) | `<YYYY-MM-DDTHH:MM:SSZ>` |
| Copilot Metrics Dashboard version | `<git SHA/tag plus web and collector image tags or digests>` |
| Source topology | `<Postgres Flexible Server, bronze storage, Container Apps/runner details>` |
| Restored topology | `<new Postgres server/database, app/job names, storage mount>` |
| Drill scope | `Postgres PITR + bronze replay/backfill validation` |
| Result | `<pass/fail/partial>` |

## Dataset under test

| Field | Value |
| --- | --- |
| Dataset description | `<orgs/scopes, preview sources included, date range>` |
| Data sensitivity / redaction notes | `<what was sanitized from this evidence>` |
| Baseline source database | `<server/database identifier; no secrets>` |
| Baseline bronze location | `<durable BRONZE_DIR path or archive identifier>` |
| PITR target dataset window | `<expected latest source/day after restore>` |
| Replay/backfill dataset window | `<source/org/day range replayed or re-collected after restore>` |
| Baseline row-count evidence | `<link or summary of sanitized count queries before restore>` |
| Baseline latest successful runs | `<latest ingestion_run success by source/org before restore>` |

Suggested baseline queries:

```sql
select source, org_id, max(target_day) as latest_success_day
from ingestion_run
where status = 'success'
group by source, org_id
order by org_id, source;

select 'fact_org_daily' as table_name, count(*) as rows from fact_org_daily
union all
select 'fact_user_daily', count(*) from fact_user_daily
union all
select 'fact_value_daily', count(*) from fact_value_daily
union all
select 'fact_roi_daily', count(*) from fact_roi_daily;
```

## PITR checklist

- [ ] Confirm automated backups and PITR are enabled for the source Postgres server.
- [ ] Record configured backup retention: `<days>`.
- [ ] Select PITR target timestamp (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`.
- [ ] Record why this target was selected: `<pre-upgrade point, simulated corruption, etc.>`.
- [ ] Restore to a new non-production server/database; never overwrite production.
- [ ] Record restore command, portal workflow, or runbook link:

  ```text
  <exact sanitized PITR command, portal operation ID, or IaC/runbook link>
  ```

- [ ] Record restore started/completed timestamps and observed RTO: `<duration>`.
- [ ] Record observed RPO/data gap relative to the target timestamp: `<duration or none>`.
- [ ] Point non-production app/job secrets at the restored database.
- [ ] Run migration/seed commands only if required by the restored schema:

  ```bash
  pnpm db:migrate
  pnpm db:seed
  ```

- [ ] Run collector and web health checks:

  ```bash
  pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check
  curl -fsS https://<non-prod-app-host>/api/health
  ```

## Bronze replay/backfill checklist

Bronze NDJSON is the audit and replay source. Record the exact command or procedure used to validate retained bronze coverage and recover the restored database through the chosen target window. If a source cannot be replayed from retained bronze with the current tooling, mark the result `partial` or `fail` and record the gap below; do not treat the bronze replay gate as passed.

- [ ] Confirm the non-production collector uses durable bronze storage, not container-local storage.
- [ ] Record restored `BRONZE_DIR` or archive location: `<path or storage identifier; no secrets>`.
- [ ] Confirm retained bronze files exist for the replay scope:

  ```text
  <source>/<org>/<YYYY-MM-DD>.ndjson
  <source>/<org>/<YYYY-MM-DD>.ndjson
  ```

- [ ] Record bronze replay or compensating backfill command:

  ```bash
  BRONZE_DIR=<non-prod-bronze-path> \
  pnpm --filter @ghcp-dash/collector exec tsx src/index.ts backfill \
    --from <yyyy-mm-dd> \
    --to <yyyy-mm-dd> \
    --orgs <org> \
    --concurrency 1
  ```

- [ ] Record whether the command replayed retained bronze or re-collected from GitHub: `<retained bronze / GitHub re-collection / mixed / unavailable>`.
- [ ] Rebuild gold if the replay procedure does not do it automatically:

  ```bash
  pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold
  ```

- [ ] Record command exit code and sanitized log link: `<exit code, log URL or artifact>`.

## Validation checks

| Check | Expected evidence | Result |
| --- | --- | --- |
| Restored DB is reachable | `/api/health` returns HTTP 200 with `readiness: "ok"` | `<pass/fail>` |
| Collector config is valid | `collect --check` succeeds against restored DB | `<pass/fail>` |
| PITR data matches target | latest successful `ingestion_run` rows align to PITR target | `<pass/fail>` |
| Baseline counts match before target | key fact/gold counts match expected baseline for target window | `<pass/fail>` |
| Bronze files are present | retained NDJSON exists for sampled source/org/day paths | `<pass/fail>` |
| Replay/backfill completed | command succeeds and affected `ingestion_run` rows are `success` | `<pass/fail>` |
| Gold tables are current | `fact_value_daily` and `fact_roi_daily` latest days match replay scope | `<pass/fail>` |
| Dashboard smoke passes | Overview, Cost & Spend, Adoption, and Pull Requests render for restored org | `<pass/fail>` |
| No sensitive data in evidence | evidence excludes secrets, tokens, connection strings, and raw payloads | `<pass/fail>` |

Validation query examples:

```sql
select source, org_id, target_day, status, rows_written, bronze_path, completed_at
from ingestion_run
where target_day between '<yyyy-mm-dd>' and '<yyyy-mm-dd>'
order by org_id, source, target_day;

select org_id, max(day) as latest_value_day
from fact_value_daily
group by org_id
order by org_id;

select org_id, max(day) as latest_roi_day
from fact_roi_daily
group by org_id
order by org_id;
```

## Failure notes and follow-up

| Field | Value |
| --- | --- |
| Failures observed | `<symptom, command, timestamp>` |
| Impact on RTO/RPO or replay confidence | `<impact>` |
| Suspected root cause | `<root cause or unknown>` |
| Remediation required | `<owner and action>` |
| Rerun required before P1 signoff? | `<yes/no>` |
| Follow-up issue/PR | `<link>` |

## Signoff

| Role | Name / handle | Date (UTC) | Decision |
| --- | --- | --- | --- |
| Operator | `<name>` | `<YYYY-MM-DD>` | `<pass/fail/partial>` |
| Reviewer | `<name>` | `<YYYY-MM-DD>` | `<accepted/rejected/needs rerun>` |
| Maintainer, if required | `<name>` | `<YYYY-MM-DD>` | `<accepted/rejected/needs rerun>` |

Signoff statement:

```text
The rehearsal was run in a non-production environment. The evidence above is sanitized and records
the selected PITR target, restored dataset, bronze replay/backfill command, validation checks,
failure notes, and reviewer decision. This record may support P1 restore-readiness assessment only
after reviewer acceptance; the template alone does not check off P1 readiness.
```
