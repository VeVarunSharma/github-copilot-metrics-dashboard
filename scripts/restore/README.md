# Restore drill scripts

These scripts support a **non-production** Copilot Metrics Dashboard restore rehearsal. They never overwrite a
source server and require `RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server`
before doing work. Do not point restored app/job secrets at production.

## `postgres-pitr-restore.sh`

Restores Azure Database for PostgreSQL Flexible Server into a **new** server.

Required inputs:

- `SOURCE_RESOURCE_GROUP`
- `SOURCE_SERVER_NAME`
- `TARGET_SERVER_NAME`
- `RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server`
- For PITR: `RESTORE_TIME_UTC` (`YYYY-MM-DDTHH:MM:SSZ`)
- For geo-restore: `RESTORE_MODE=geo` and `LOCATION`

Optional inputs: `TARGET_RESOURCE_GROUP` (defaults to source group), `LOCATION` for PITR when
needed, `SOURCE_SUBSCRIPTION_ID` or `SOURCE_SERVER_ID` when the source server is in another
subscription or should be addressed by full Azure resource ID.

## `bronze-replay-backfill.sh`

Runs the collector backfill against the restored non-production database using the mounted
`BRONZE_DIR`, then rebuilds gold. The current collector CLI does not expose an offline
bronze-only replay command; this script validates retained bronze is present and uses the
idempotent backfill path (`ingestion_run` checkpoints plus silver upserts) to recover the window.

Required inputs:

- `DATABASE_URL` for the restored non-production database
- `GITHUB_TOKEN`
- `GITHUB_ORGS` or `GITHUB_ENTERPRISE` (or `ORGS` / `ENTERPRISE` overrides)
- `BRONZE_DIR`
- `FROM_DATE`, `TO_DATE`
- `RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server`

Optional inputs: `CONCURRENCY` (default `1`), `WITH_DELIVERY=true`, `VERBOSE=true`,
`CHECK_BRONZE_COVERAGE=false`.

## `validate-restore.sh`

Checks key restored table counts, rebuilds gold, and verifies `/api/health` returns readiness
`ok` with `staleDataStatus: "fresh"`.

Required inputs:

- `DATABASE_URL` for the restored non-production database
- `GITHUB_TOKEN`
- `GITHUB_ORGS` or `GITHUB_ENTERPRISE`
- `WEB_HEALTH_URL` or `WEB_BASE_URL`
- `RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server`

Optional inputs: `REQUIRE_NONZERO_COUNTS=false` for intentionally tiny rehearsal datasets.
