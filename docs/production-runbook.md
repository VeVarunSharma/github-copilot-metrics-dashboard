# Production self-host runbook

> **Beta/P1 caveat:** this runbook is P1 target guidance, not a production-readiness claim. Copilot Metrics Dashboard is currently P0 OSS beta. Use this document to plan and operate a self-hosted deployment, but do not claim production readiness until the P1 gates in `specs/08-launch-readiness-and-priorities.md` pass and the Azure artifacts are complete, tested, and security-reviewed.

## Scope and assumptions

- Target topology: Azure Container Apps web service, Azure Container Apps Jobs for migration/bootstrap and scheduled collection (or equivalent controlled runners), Azure Database for PostgreSQL Flexible Server, Azure Key Vault, Azure Container Registry, and Log Analytics.
- Local `infra/docker-compose.yml` is for development only. It starts Postgres and Adminer; it is not a production topology.
- The collector is the only component that should hold outbound GitHub credentials. The web app should have database read access only.
- The current Bicep/azd template is a single-region P1 foundation. Production operators should pin image tags, enable Entra-backed Container Apps EasyAuth where possible, configure alerts, bootstrap separate database roles, and review the limitations in [`infra/bicep/README.md`](../infra/bicep/README.md).

## Required runtime configuration

| Component | Required values | Notes |
| --- | --- | --- |
| Web | `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_BASE_URL`, `AUTH_MODE`, optional `DASHBOARD_PASSWORD` | Use `web_readonly` in production. Recommended Azure posture is Container Apps EasyAuth with `AUTH_MODE=identity-header` and trusted `x-ms-client-principal-name`. `/api/health` and `/calculator` remain public. |
| Collector | `DATABASE_URL`, `GITHUB_TOKEN`, `GITHUB_ORGS` or `GITHUB_ENTERPRISE` | Use `collector_writer`, which can write ingestion, silver, and gold tables but cannot run DDL/migrations. |
| Collector optional | `GITHUB_API_BASE_URL`, `BRONZE_DIR`, `LOG_LEVEL`, `GITHUB_INGEST_DELIVERY` | `BRONZE_DIR` must be durable storage in production. |
| Migration/bootstrap runner | `DATABASE_URL`, optional `DB_MAX_CONNECTIONS` | Use `migration_admin` for `pnpm db:migrate` and `pnpm db:seed` or the Bicep-provisioned migration/bootstrap job. |

GitHub token scopes:

- Org ingestion: classic PAT with `read:org`; add `manage_billing:copilot` for billing and AI credits.
- Enterprise ingestion: classic PAT with `read:enterprise` or `manage_billing:copilot`; billing still needs `manage_billing:copilot`.
- Delivery ingestion (`GITHUB_INGEST_DELIVERY=true` or `--with-delivery`): add `repo` or `public_repo`.

## Database role bootstrap

Use [`infra/postgres/bootstrap-roles.sql`](../infra/postgres/bootstrap-roles.sql) to create repeatable Postgres roles and grants. This artifact is **operator-run guidance**; the current Bicep template provisions a migration/bootstrap job for Drizzle migrations and production-safe seed, but it does not execute this SQL or automatically provision the database roles.

Run it as the server admin, database owner, or another trusted bootstrap principal after the database exists:

```bash
psql "$ADMIN_DATABASE_URL" \
  -v web_readonly_password="$WEB_READONLY_PASSWORD" \
  -v collector_writer_password="$COLLECTOR_WRITER_PASSWORD" \
  -v migration_admin_password="$MIGRATION_ADMIN_PASSWORD" \
  -f infra/postgres/bootstrap-roles.sql
```

For a clean database, run the script once before migrations to create `migration_admin`, run `pnpm db:migrate` and `pnpm db:seed` with the `migration_admin` URL (or start the migration/bootstrap Container Apps Job), then rerun the script so table grants apply to newly created objects. If tables already exist under a different owner, `migration_admin` may still need an explicit ownership-transfer plan before it can ALTER those tables.

Construct and store three separate `DATABASE_URL` values, URL-encoding passwords as needed:

- `web_readonly` for the web app.
- `collector_writer` for the scheduled collector.
- `migration_admin` for migration/seed runners only.

## azd provisioning and deployment

The preferred Azure deployment path is Azure Developer CLI using the root `azure.yaml`. The project uses a subscription-scoped wrapper (`infra/main.bicep`) that creates or updates the azd resource group and invokes the existing resource-group scoped module (`infra/bicep/main.bicep`).

Minimum clean-environment flow:

```bash
azd auth login
azd env new prod
azd env set AZURE_LOCATION eastus
azd env set POSTGRES_ADMIN_USERNAME ghcpadmin
azd env set POSTGRES_ADMIN_PASSWORD '<strong-secret>'
azd env set WEB_READONLY_PASSWORD '<strong-distinct-secret>'
azd env set COLLECTOR_WRITER_PASSWORD '<strong-distinct-secret>'
azd env set MIGRATION_ADMIN_PASSWORD '<strong-distinct-secret>'
azd env set GITHUB_TOKEN '<classic-pat>'
azd env set GITHUB_ORGS 'my-org'
azd env set DASHBOARD_PASSWORD '<fallback-secret>'
azd up
```

`azd up` builds and pushes the web and collector images, provisions Azure resources, runs the role bootstrap/migration/seed/grant-refresh hook, deploys services, and checks `/api/health`. If your azd version cannot deploy Container Apps Jobs as services, use the emitted `ACR_LOGIN_SERVER`, build/push `ghcp-collector:<tag>` with `infra/docker/Dockerfile.collector`, then rerun `azd provision` or a direct Bicep deployment with explicit collector/migration image refs.

### Collector job image fallback

The GitHub Copilot Metrics Dashboard collector is provisioned as a Container Apps Job, while `azure.yaml` declares it as an azd `containerapp` service so azd can build and push the collector image. Container Apps Job deploy support varies by azd version. To make upgrades reliable, the `postdeploy` hook performs an idempotent fallback update:

```bash
az containerapp job update -g "$AZURE_RESOURCE_GROUP" -n "$COLLECTOR_JOB_NAME" --image "$SERVICE_COLLECTOR_IMAGE_NAME"
```

`COLLECTOR_JOB_NAME` comes from the Bicep `collectorJobName` output and `SERVICE_COLLECTOR_IMAGE_NAME` is the image reference produced by azd packaging. If any required value is unavailable, the hook logs a skip message and leaves the deployment result to azd.

### Entra dashboard auth

Recommended production access control is Container Apps EasyAuth with Microsoft Entra ID:

```bash
azd env set ENABLE_ENTRA_AUTH true
azd env set ENTRA_CLIENT_ID '<app-client-id>'
azd env set ENTRA_CLIENT_SECRET '<app-client-secret>'
azd up
```

When enabled, Bicep creates the `entra-client-secret` Key Vault secret, configures the web Container App `authConfigs/current`, and sets `AUTH_MODE=identity-header`. EasyAuth requires authentication for dashboard routes and excludes `/api/health`, `/calculator`, and `/calculator/*`. Keep `ENABLE_ENTRA_AUTH=false` only for local/demo, externally protected ingress, or the documented shared-password fallback.

### Alerts and availability

Enable operational alerts with an email or webhook receiver:

```bash
azd env set ENABLE_ALERTS true
azd env set ALERT_EMAIL_RECEIVER ops@example.com
azd env set ENABLE_AVAILABILITY_TEST true
azd up
```

The deployment creates alert rules for collector failed runs, stale ingestion, migration failures, repeated GitHub API errors, web health failures, Postgres CPU/storage pressure, and storage capacity pressure. The ingestion freshness rules depend on collector log lines containing `event=ingestion_run_finalized`.

## Initial deployment order

1. **Select a release and azd environment.** Prefer immutable tagged releases and a dedicated azd environment per deployment stage.

2. **Set required azd environment values.** Include Azure location, Postgres admin credentials, three database role passwords, GitHub collector scope/token, dashboard fallback secret, and optional Entra/alert settings. Keep secrets in azd environment storage and Key Vault; do not commit them.

3. **Run `azd up`.** This provisions the subscription wrapper, builds and pushes web/collector images to ACR, configures Container Apps/Jobs, bootstraps database roles, runs migrations and production-safe seed with `migration_admin`, refreshes grants, deploys, and smokes `/api/health`.

4. **Verify database role separation.** Confirm web uses `web_readonly`, collector uses `collector_writer`, and only hooks/manual migration jobs use `migration_admin`. The web app must not receive `GITHUB_TOKEN`.

5. **Verify auth posture.** For production, prefer `ENABLE_ENTRA_AUTH=true` and validate Entra sign-in to a protected dashboard route while `/api/health` and `/calculator` remain public. If using shared-password mode, document the accepted fallback risk.

6. **Verify alerts.** If `ENABLE_ALERTS=true`, confirm the action group receiver, the Application Insights availability test when enabled, and the Log Analytics scheduled-query rules. The stale/failed ingestion queries require collector `event=ingestion_run_finalized` logs.

7. **Run collector smoke and initial ingestion.** Validate config and token scopes, then backfill the desired range with `--concurrency 1`. Enable the daily schedule after the backfill is healthy.

## Migration and upgrade procedure

1. Read the release notes for schema, environment, value-methodology, or operational changes.
2. Pause the scheduled collector job.
3. Confirm a recent backup exists and that PITR is enabled. For high-risk upgrades, restore a non-production copy first and rehearse the migration.
4. Run `azd up` for the new release/environment, or build and push versioned web and collector images if using a manual path.
5. Run migration/bootstrap before updating web or collector traffic. The azd `postprovision` hook performs role bootstrap, migration, seed, and grant refresh. Manual Azure path:

   ```bash
   az containerapp job start -g <resource-group> -n <migrationJobName>
   az containerapp job execution list -g <resource-group> -n <migrationJobName> -o table
   ```

   Wait for the latest execution to report `Succeeded`.

   Trusted-runner fallback:

   ```bash
   DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:bootstrap
   ```

6. Rerun `infra/postgres/bootstrap-roles.sql` with the current role passwords to refresh grants for any new or changed tables.

   Legacy databases whose tables were created by a non-azd role may also need an explicit ownership transfer before `migration_admin` can ALTER schema objects. This is opt-in only; do not use it for clean azd deployments. Run it from a trusted admin session after taking a backup:

   ```bash
   psql "$ADMIN_DATABASE_URL" \
     -v web_readonly_password="$WEB_READONLY_PASSWORD" \
     -v collector_writer_password="$COLLECTOR_WRITER_PASSWORD" \
     -v migration_admin_password="$MIGRATION_ADMIN_PASSWORD" \
     -v reassign_owner=true \
     -v reassign_owner_from="<legacy-owner-role-if-known>" \
     -f infra/postgres/bootstrap-roles.sql
   ```

   Omit `reassign_owner_from` if no single legacy role is known; the script still attempts targeted `ALTER OWNER` statements for app objects in the `public` and `drizzle` schemas. The executing principal must have enough Postgres privileges to reassign or alter object ownership.

7. If release notes mention value-methodology or gold-table changes, rebuild gold:

   ```bash
   pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold
   ```

8. Deploy the web image, verify `/api/health`, then deploy/update the collector job image. With azd, this is handled by `azd up`; if job service mapping is unavailable, manually push the collector image and redeploy the job image ref.
9. Run collector smoke:

   ```bash
   pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check
   ```

10. Run a targeted backfill for any missed days, then resume the schedule.

Rollback posture: there are no documented down migrations. Prefer forward fixes. If a migration corrupts production state or leaves the schema unusable, restore Postgres to a pre-upgrade point in time and redeploy the previous tagged images.

## Collector operations

### Daily run

```bash
pnpm collect --concurrency 1
```

Equivalent explicit form:

```bash
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --concurrency 1
```

Daily collection writes bronze NDJSON first, upserts silver facts, records `ingestion_run`, and rebuilds gold for the ingested day.

### Backfill

```bash
pnpm collect:backfill --from <yyyy-mm-dd> --to <yyyy-mm-dd> --concurrency 1
```

Backfills are idempotent. Successful `(source, org, day)` runs are skipped; failed or partial days can be rerun safely.

### Delivery preview ingestion

Delivery sources are off by default. Enable with either:

```bash
GITHUB_INGEST_DELIVERY=true pnpm collect --concurrency 1
pnpm collect:backfill --from <yyyy-mm-dd> --to <yyyy-mm-dd> --with-delivery --concurrency 1
```

This requires `repo` or `public_repo` scope and should remain preview/advanced until P1/P2 readiness gates pass.

### Config and health smokes

```bash
pnpm smoke:collector-config
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check
```

`config-check` validates required environment wiring without GitHub calls. `collect --check` pings Postgres and validates the GitHub token/scopes.

## Backup, restore, and PITR

### Postgres

- Enable automated backups before the first production ingestion.
- Keep retention aligned to customer recovery needs; the current Bicep default is 7 days and should be reviewed for production.
- Enable and document point-in-time restore for the Flexible Server.
- Test restore into a non-production environment before claiming P1 readiness; record the drill with
  the [`restore rehearsal evidence template`](./restore-rehearsal.md).
- Capture a pre-upgrade restore point before migrations.

Restore pattern:

1. Restore Postgres to a new server/database at the desired point in time.
2. Recreate or update Key Vault database URL secrets to point apps/jobs at the restored database.
3. Run the migration/bootstrap job or `DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:bootstrap` only if the restored point predates the deployed app schema or seed baseline.
4. Run `collect --check`, then backfill from the restored database's latest successful day through yesterday.

### Bronze files

Bronze NDJSON is the audit and replay source. In production, configure `BRONZE_DIR` to durable storage mounted into the collector job or copied to an external archive. Default retention is 90 days unless operators configure a different policy. Container-local storage is not sufficient for production recovery. Non-production restore drills should record the bronze replay or compensating backfill command in [`docs/restore-rehearsal.md`](./restore-rehearsal.md).

### Export/archive

Customers with external retention requirements should periodically archive:

- Postgres backups or logical exports.
- Bronze NDJSON.
- Optional Parquet exports:

  ```bash
  pnpm --filter @ghcp-dash/collector exec tsx src/index.ts export-parquet --out ./exports
  ```

## Secret rotation

### GitHub token

1. Create a new classic PAT with the required scopes.
2. Update the `GITHUB_TOKEN` secret in Key Vault.
3. Restart or re-run the collector job so it reads the new secret version.
4. Run:

   ```bash
   pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check
   ```

5. Revoke the old token after a successful check.

### Dashboard password

1. Update `DASHBOARD_PASSWORD` in the secret store.
2. Restart the web app.
3. Existing signed sessions become invalid because the password is the signing secret.

Shared-password auth is a beta fallback, not production RBAC/OAuth.

### Database credentials

1. Re-run `infra/postgres/bootstrap-roles.sql` with a replacement password for the affected role and unchanged strong passwords for the other roles.
2. Update the appropriate `DATABASE_URL` secrets for web, collector, and migration runner.
3. Restart web and collector workloads.
4. Verify `/api/health` and `collect --check`.
5. Revoke old credentials after verification.

## Health and stale-data checks

### Web

```bash
curl -fsS https://<app-host>/api/health
```

Expected healthy response includes:

```json
{ "status": "ok", "liveness": "ok", "readiness": "ok", "checks": { "db": "ok" } }
```

### Collector and data freshness

Use logs plus database checks. Useful SQL:

```sql
-- Recent collector runs
select source, org_id, target_day, status, started_at, completed_at, rows_written, error_message
from ingestion_run
order by started_at desc
limit 50;

-- Failed runs
select source, org_id, target_day, attempts, completed_at, error_message
from ingestion_run
where status = 'failed'
order by completed_at desc
limit 25;

-- Latest successful source data by org
select org_id, source, max(target_day) as latest_success_day
from ingestion_run
where status = 'success' and target_day is not null
group by org_id, source
order by org_id, source;

-- Latest gold ROI day by org
select org_id, max(day) as latest_gold_day
from fact_roi_daily
group by org_id
order by org_id;
```

Alert when:

- The scheduled collector job fails or does not run.
- Any required source has no successful run for yesterday UTC after the normal data-availability window.
- Gold data (`fact_roi_daily` or `fact_value_daily`) is more than 1-2 days behind successful silver ingestion.
- Web `/api/health` returns 503.
- Postgres storage, connection count, or backup failures approach limits.

## Troubleshooting

### Failed ingestion

Symptoms: collector job failure, `ingestion_run.status = 'failed'`, missing source/day rows, or stale dashboard data.

Actions:

1. Inspect collector logs in Log Analytics or the job runner.
2. Query recent `ingestion_run` rows and note `source`, `org_id`, `target_day`, `attempts`, `bronze_path`, and `error_message`.
3. Rerun the affected range; ingestion is idempotent:

   ```bash
   pnpm collect:backfill --from <failed-day> --to <failed-day> --orgs <org> --concurrency 1 --verbose
   ```

4. Increase `--max-retries` for transient GitHub/API failures.
5. Treat 204/no-content days as normal if GitHub has no data for that day.

### Expired or under-scoped GitHub token

Symptoms: `Bad credentials`, HTTP 401/403, missing scope warnings, billing/AI credits skipped, or `collect --check` failure.

Actions:

1. Run `collect --check`.
2. Rotate the PAT with the required scopes.
3. Confirm the token is a classic PAT for billing endpoints.
4. For enterprise ingestion, do not use a `gh` CLI `gho_` token for enterprise endpoints.
5. Rerun the failed backfill/day after the check passes.

### Database connectivity failure

Symptoms: `/api/health` returns 503, `Database ping failed`, `DATABASE_URL is required`, connection timeout, or migration/collector startup failure.

Actions:

1. Verify the correct `DATABASE_URL` secret is attached to the workload.
2. Verify Postgres server state, firewall/private networking, SSL mode, DNS, and credentials.
3. Check connection saturation; tune `DB_MAX_CONNECTIONS` only within Postgres capacity.
4. Confirm the web is using `web_readonly`, the collector is using `collector_writer`, and the migration runner is using `migration_admin`.
5. If errors mention permission denied on a newly added table, rerun `infra/postgres/bootstrap-roles.sql` with the current role passwords.
6. Re-run `/api/health` and `collect --check`.

### Failed gold rebuild

Symptoms: stale or missing `fact_value_daily` / `fact_roi_daily`, errors from `gold`, or updated knobs not reflected.

Actions:

1. Confirm silver source facts exist for the affected org/day.
2. Confirm `settings.value_translation_knobs` exists; run `pnpm db:seed` if defaults are missing.
3. Rerun:

   ```bash
   pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold --verbose
   ```

4. If a bad knob or methodology rollout caused incorrect values, restore the prior settings from backup or revert the setting, then rerun `gold`.
5. If gold rebuild fails after a schema upgrade, stop the collector schedule and forward-fix or restore to the pre-upgrade PITR point.

### Failed migrations

Symptoms: the migration/bootstrap job fails, `pnpm db:migrate` fails, web/collector errors mention missing columns/tables, or the migration runner lacks permissions.

Actions:

1. Stop the deployment and keep the collector schedule paused.
2. Verify the migration runner points to the intended production database.
3. Verify the migration credential can create/alter tables and write Drizzle migration metadata.
4. Inspect the failed Container Apps job logs or trusted-runner output and rerun only after correcting the root cause.
5. Do not use `pnpm db:seed:reset` to fix migrations; it deletes facts and `ingestion_run`.
6. If production schema is partially applied and unusable, restore Postgres to the pre-migration PITR point and redeploy the previous tagged images, or apply a forward-fix migration.
