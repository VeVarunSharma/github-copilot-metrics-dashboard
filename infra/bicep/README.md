# Azure deployment foundation

This folder contains the resource-group scoped Bicep module used by the Azure Developer CLI (`azd`) subscription wrapper in `../main.bicep`. It is a P1 hardening foundation, not a production-readiness claim; production readiness remains gated by `specs/08-launch-readiness-and-priorities.md` and restore rehearsal evidence.

## azd deployment flow

`azure.yaml` points `infra.path` to `infra` and `infra.module` to `main`. The wrapper creates/updates `rg-${AZURE_ENV_NAME}` at subscription scope, then invokes this resource-group scoped module.

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
azd env set DASHBOARD_PASSWORD '<shared-password-fallback-secret>'
azd up
```

`azd up` packages the `web` service from `infra/docker/Dockerfile.web` and the `collector` service from `infra/docker/Dockerfile.collector`, pushes both to the provisioned ACR via `SERVICE_WEB_IMAGE_NAME` and `SERVICE_COLLECTOR_IMAGE_NAME`, provisions infrastructure, runs hooks, deploys, and finally checks `/api/health`. The web Container App is tagged `azd-service-name=web`; the collector job is tagged `azd-service-name=collector`. If your installed `azd` cannot map Container Apps Jobs as deployable services, run `azd package`/`azd deploy web`, then build/push the collector image to `ACR_LOGIN_SERVER/ghcp-collector:<tag>` and redeploy with `COLLECTOR_IMAGE`/`SERVICE_COLLECTOR_IMAGE_NAME` equivalent, or pass explicit `collectorImage`/`migrationImage` to the Bicep module.

## Hooks

- `preprovision` validates required environment variables and never prints secrets.
- `postprovision` temporarily permits only the deployment client's current IPv4 address to reach PostgreSQL, guarantees firewall-rule cleanup with an exit trap, runs `infra/postgres/bootstrap-roles.sql`, runs `pnpm db:migrate` and production-safe `pnpm db:seed` with `migration_admin`, reruns the role bootstrap, then verifies grants. It refreshes Key Vault URLs only when Key Vault references are enabled; the direct-secret fallback receives role-specific URLs from Bicep.
- `postdeploy` curls the emitted `HEALTH_URL` and fails on non-200.

Required local tools for hooks: `psql`, `pnpm`, `node`, `az`, and `curl`.

## What `main.bicep` provisions

- Azure Container Registry for versioned web/collector images.
- Log Analytics workspace attached to a Container Apps environment.
- Optional Application Insights component and standard availability test for `/api/health`.
- Optional Azure Monitor action group and alert rules.
- Azure Database for PostgreSQL Flexible Server and one database, with configurable backup retention and geo-redundant backup toggle.
- Azure Key Vault for runtime secrets, including `entra-client-secret` for EasyAuth when enabled.
- Storage account with an Azure Files `bronze` share and an `exports` blob container with lifecycle management.
- Separate user-assigned managed identities for web, migration/bootstrap, and collector.
- Web Azure Container App with `/api/health` probes and optional Container Apps EasyAuth with Microsoft Entra ID.
- Manual migration/bootstrap Container Apps Job.
- Scheduled collector Container Apps Job, defaulting to `--concurrency 1`.

## Key parameters

| Parameter | Purpose |
| --- | --- |
| `enableEntraAuth` | Enables Container Apps EasyAuth for the web app. When true, Bicep sets `AUTH_MODE=identity-header`. |
| `entraClientId` | Entra app/client ID used by EasyAuth. |
| `entraClientSecret` | Secret stored in Key Vault as `entra-client-secret` and referenced by EasyAuth. |
| `authMode` | Fallback app auth mode when EasyAuth is disabled: `open`, `shared-password`, or `identity-header`. |
| `webDatabaseUrl`, `collectorDatabaseUrl`, `migrationDatabaseUrl` | Optional DB URL overrides; azd postprovision also refreshes Key Vault with least-privilege role URLs. |
| `useKeyVaultReferences` | Defaults to `true`. Set `USE_KEY_VAULT_REFERENCES=false` only for policy-constrained POCs where Key Vault data-plane access is disabled; Container Apps then receive encrypted role-specific secrets while Key Vault retains ARM-managed copies. |
| `enableAlerts` | Enables action group and alert rules. Set `alertEmailReceiver` or `alertWebhookReceiverUrl`. |
| `enableAvailabilityTest` | Enables Application Insights and the standard web test for `/api/health`. |
| `postgresBackupRetentionDays`, `postgresGeoRedundantBackup` | Flexible Server backup posture. |
| `bronzeShareQuotaGb` | Azure Files quota for bronze NDJSON retention. |
| `enableBronzeFileShareMount` | Defaults to `true`. Set `ENABLE_BRONZE_FILE_SHARE_MOUNT=false` only for policy-constrained POCs; collector bronze files then use ephemeral `/tmp/bronze`. |
| `enableExportsLifecyclePolicy`, `exports*AfterDays` | Blob lifecycle rules for the `exports` container. |

## Authentication

The recommended production path is public Container Apps ingress protected by Container Apps built-in authentication with Microsoft Entra ID:

```bash
azd env set ENABLE_ENTRA_AUTH true
azd env set ENTRA_CLIENT_ID '<app-client-id>'
azd env set ENTRA_CLIENT_SECRET '<app-client-secret>'
azd up
```

EasyAuth redirects unauthenticated users to Entra, strips spoofed client identity headers at the platform boundary, and injects `x-ms-client-principal-name`; the app reads that header because `AUTH_MODE=identity-header`. `/api/health`, `/calculator`, and `/calculator/*` are excluded from EasyAuth. Shared-password and open modes remain available by setting `ENABLE_ENTRA_AUTH=false` and `AUTH_MODE` appropriately.

Networking intentionally remains public ingress for this workstream. For high-sensitivity deployments, document and add a hardened-ingress layer such as Front Door/WAF, strict EasyAuth group/app assignment, custom domains/TLS, IP restrictions where appropriate, and private networking as a separate topology decision.

## Alert rules

When `enableAlerts=true`, the module creates:

1. Collector failed ingestion runs — Log Analytics query over Container Apps console logs.
2. Stale ingestion data — Log Analytics query requiring a recent successful collector finalization.
3. Migration job failures — Log Analytics query over migration job logs.
4. Repeated GitHub API errors — Log Analytics query over collector logs.
5. Web `/api/health` failures — availabilityResults query, created when `enableAvailabilityTest=true`.
6. PostgreSQL high CPU — metric alert on `cpu_percent`.
7. PostgreSQL high storage — metric alert on `storage_percent`.
8. Storage capacity pressure — metric alert on storage account `UsedCapacity` for exports/bronze pressure.

The stale and failed-ingestion rules depend on the collector structured log marker `event=ingestion_run_finalized` with fields `status`, `source`, `orgId`, `targetDay`, `rowsWritten`, `durationMs`, and `attempts`.

## Storage, bronze, and backups

Postgres automated backup retention defaults to 7 days and can be set up to 35 days with `postgresBackupRetentionDays`; `postgresGeoRedundantBackup` toggles geo-redundant backups where supported by region/SKU. The collector mounts an Azure Files share named `bronze`; `bronzeShareQuotaGb` is the quota and operational pressure boundary. Bronze file deletion/retention is still owned by collector behavior and operator policy; Azure Files lifecycle cleanup is not configured here. The `exports` blob container has lifecycle management for cool/archive/delete transitions via `exportsCoolAfterDays`, `exportsArchiveAfterDays`, and `exportsDeleteAfterDays`.

## Direct Bicep deployment

The resource-group scoped module still works without azd:

```bash
az group create -n rg-ghcpdash-dev -l eastus
az deployment group create \
  -g rg-ghcpdash-dev \
  -f infra/bicep/main.bicep \
  --parameters infra/bicep/main.bicepparam
```

For direct deployment, build and push images yourself or pass immutable `webImage`, `collectorImage`, and `migrationImage` values. Before user traffic, run role bootstrap, migrations, production-safe seed, rerun bootstrap, and verify `/api/health` as described above or in `docs/production-runbook.md`.

## Current limitations / P1 caveat

- Public ingress and public service endpoints are intentional for this workstream; hardened ingress is documented, not implemented.
- `azd` support for Container Apps Jobs can vary by version; the collector job is tagged for service mapping, but older CLIs may require manual collector image push/redeploy.
- Restore rehearsal remains owned by `docs/restore-rehearsal.md`; do not claim production readiness until it is completed.
