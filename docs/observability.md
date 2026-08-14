# Observability guidance

Copilot Metrics Dashboard is currently a **P0 OSS Beta**. This page documents the current health endpoint, collector run audit trail, and recommended P1 observability posture. Production readiness remains gated by the P1 requirements in [`specs/08-launch-readiness-and-priorities.md`](../specs/08-launch-readiness-and-priorities.md).

## Web health endpoint

The web app exposes `GET /api/health` through the ts-rest contract. The route is public so deployment platforms can probe it even when dashboard auth is enabled.

Current response shape:

```json
{
  "status": "ok",
  "schemaVersion": 1,
  "liveness": "ok",
  "readiness": "ok",
  "checks": {
    "db": "ok"
  },
  "lastSuccessfulIngestionCompletedAt": "2026-07-02T04:00:00.000Z",
  "lastSuccessfulIngestionTargetDay": "2026-07-01",
  "staleDataStatus": "fresh",
  "staleDataWarning": null,
  "staleAfterHours": 26
}
```

Behavior:

| Condition | HTTP status | `status` / `readiness` | `checks.db` | Freshness fields |
| --- | ---: | --- | --- | --- |
| `DATABASE_URL` is set and the database ping succeeds | `200` | `ok` | `ok` | Latest `ingestion_run.status = 'success'` row is summarized. |
| Latest successful ingestion completed more than 26 hours ago | `200` | `ok` | `ok` | `staleDataStatus = "stale"` and `staleDataWarning` explains the threshold. |
| Database is reachable but no successful ingestion exists yet | `200` | `ok` | `ok` | `staleDataStatus = "unknown"` with `lastSuccessful* = null`. |
| `DATABASE_URL` is set and the database ping fails | `503` | `degraded` | `error` | Freshness is `unknown`; the web app does not query `ingestion_run`. |
| `DATABASE_URL` is unset | `503` | `degraded` | `unconfigured` | Freshness is `unknown`; the database client is not initialized. |

`liveness` is currently always `ok` when the route executes. The HTTP status reflects readiness, not process liveness. Stale or missing ingestion data is visible in the JSON body but does not by itself make the health endpoint return `503`; use freshness alerts for paging or investigation.

Freshness fields are additive and nullable/optional for backwards compatibility:

| Field | Meaning |
| --- | --- |
| `lastSuccessfulIngestionCompletedAt` | ISO timestamp for the most recent successful collector run, or `null` when unknown. |
| `lastSuccessfulIngestionTargetDay` | Target day from that successful run, or `null` when the run did not have a target day or no success exists. |
| `staleDataStatus` | `fresh`, `stale`, or `unknown` based on the most recent successful run's completion timestamp. |
| `staleDataWarning` | Human-readable warning when data is stale or no successful run exists; `null` when fresh or DB status is unavailable. |
| `staleAfterHours` | Freshness threshold used by the health endpoint. Defaults to `26` for the daily collector schedule. |

Recommended probes:

- **Readiness:** `GET /api/health`, expect HTTP `200`, `readiness = ok`, and `checks.db = ok`. Suggested starting point: every 30 seconds, 5-second timeout, fail after 3 consecutive failures.
- **Liveness:** prefer a platform process/TCP probe on the web container port, or a probe that treats transport failure/timeouts as liveness failures and reads the JSON body if available. Do not restart the web app solely because `/api/health` returns `503` during a database outage; that is a readiness degradation.
- **Freshness:** `GET /api/health`, inspect `staleDataStatus` and `lastSuccessfulIngestionCompletedAt`; treat `stale` or long-running `unknown` as an operational alert, not a web-process liveness failure.
- **Startup:** allow enough time for Next.js startup and first database connection before marking the app unhealthy.

Local check:

```bash
pnpm web
curl -i http://localhost:3000/api/health
```

## Collector run status

The collector records each source/org/day attempt in the `ingestion_run` table. This table is both an idempotency checkpoint and the durable audit trail for operations.

| Column | Meaning |
| --- | --- |
| `run_id` | Unique collector attempt identifier. |
| `source` | Ingestor source, such as org metrics, users, teams, billing, AI credits, or delivery sources. |
| `org_id` | Organization or enterprise slug represented in the dashboard. |
| `target_day` | Day being ingested. Some "latest" style runs may use `NULL`; bronze writes use `latest.ndjson` for that case. |
| `started_at`, `completed_at` | Run timing. A `running` row with an old `started_at` can indicate a stuck or crashed collector. |
| `status` | `running`, `success`, `failed`, `no_content`, or `partial`. `no_content` is terminal and usually means GitHub returned no data or the feature is unavailable. |
| `rows_written` | Number of silver rows written for the source/day. Zero can be valid for `no_content` or empty reports; investigate zero-row `success` when data is expected. |
| `bronze_path` | Local bronze NDJSON path written before parsing, normally `./data/bronze/{source}/{orgId}/{YYYY-MM-DD}.ndjson`. |
| `error_message` | Sanitized failure summary. Do not store raw payloads, tokens, or signed URLs here. |
| `attempts` | Retry/checkpoint attempt count for the same `(source, org_id, target_day)`. |

Useful status SQL:

```sql
-- Recent collector attempts.
SELECT source, org_id, target_day, status, rows_written, bronze_path,
       started_at, completed_at, attempts, error_message
FROM ingestion_run
ORDER BY started_at DESC
LIMIT 50;

-- Latest successful ingestion by source and org.
SELECT source, org_id, max(completed_at) AS last_success_at,
       max(target_day) AS latest_successful_day
FROM ingestion_run
WHERE status = 'success'
GROUP BY source, org_id;

-- Stale data candidates for a daily schedule.
SELECT source, org_id, max(completed_at) AS last_success_at
FROM ingestion_run
WHERE status = 'success'
GROUP BY source, org_id
HAVING max(completed_at) < now() - interval '26 hours';

-- Stuck collector attempts.
SELECT run_id, source, org_id, target_day, started_at, attempts
FROM ingestion_run
WHERE status = 'running'
  AND started_at < now() - interval '2 hours';

-- Stale gold data candidates. Gold should not lag the latest silver org day by more than one day.
WITH silver AS (
  SELECT org_id, max(day) AS latest_silver_day
  FROM fact_org_daily
  GROUP BY org_id
),
value_gold AS (
  SELECT org_id, max(day) AS latest_value_day
  FROM fact_value_daily
  GROUP BY org_id
),
roi_gold AS (
  SELECT org_id, max(day) AS latest_roi_day
  FROM fact_roi_daily
  GROUP BY org_id
)
SELECT s.org_id, s.latest_silver_day, v.latest_value_day, r.latest_roi_day
FROM silver s
LEFT JOIN value_gold v USING (org_id)
LEFT JOIN roi_gold r USING (org_id)
WHERE s.latest_silver_day >= current_date - 2
  AND (
    v.latest_value_day IS NULL
    OR r.latest_roi_day IS NULL
    OR v.latest_value_day < s.latest_silver_day - 1
    OR r.latest_roi_day < s.latest_silver_day - 1
  );
```

The dashboard also exposes `GET /api/ingestion/runs?orgId={org}&from={YYYY-MM-DD}&to={YYYY-MM-DD}&limit=30` for authenticated application use. It returns run status, rows, attempts, timestamps, bronze paths, and error summaries for the selected org/date window.

## P1 alert catalog

These are the P1 alert definitions for production self-host operations. The Azure Bicep deployment now provisions default Azure Monitor alert rules behind opt-in toggles, while the catalog below remains the operator-facing reference for thresholds, sources, and responses.

### Provisioned Azure Monitor alerts (Bicep/azd)

`infra/bicep/main.bicep` provisions Azure Monitor alerting when enabled through `infra/main.parameters.json` / azd environment variables:

- `enableAlerts` (`ENABLE_ALERTS`) creates an action group (`Microsoft.Insights/actionGroups`) with an email receiver from `alertEmailReceiver` (`ALERT_EMAIL_RECEIVER`) and provisions the alert rules below.
- `enableAvailabilityTest` (`ENABLE_AVAILABILITY_TEST`) creates an Application Insights component and a `Microsoft.Insights/webtests` availability test against the web `/api/health` endpoint. `webHealthFailureAlert` is created only when both availability testing and alerts are enabled.

Provisioned alert rules:

| Rule name | Resource type | Detects |
| --- | --- | --- |
| `failedCollectorRunAlert` | `Microsoft.Insights/scheduledQueryRules` | Collector ingestion runs finalized with failed or partial status. |
| `staleIngestionAlert` | `Microsoft.Insights/scheduledQueryRules` | No recent successful finalized ingestion signal inside the freshness window. |
| `migrationFailureAlert` | `Microsoft.Insights/scheduledQueryRules` | Migration/deployment logs that indicate Drizzle or database migration failure. |
| `githubApiErrorAlert` | `Microsoft.Insights/scheduledQueryRules` | Repeated GitHub API failures, rate-limit errors, or retry exhaustion in collector logs. |
| `webHealthFailureAlert` | `Microsoft.Insights/scheduledQueryRules` | Availability test failures for the web `/api/health` endpoint. Requires `enableAvailabilityTest=true`. |
| `postgresCpuAlert` | `Microsoft.Insights/metricAlerts` | PostgreSQL CPU pressure. |
| `postgresStorageAlert` | `Microsoft.Insights/metricAlerts` | PostgreSQL storage pressure. |
| `storageCapacityAlert` | `Microsoft.Insights/metricAlerts` | Bronze/storage account capacity pressure. |

The collector emits a structured, secret-free JSON log line when each ingestion run finalizes. Alert queries key off `event == "ingestion_run_finalized"` with fields `status`, `source`, `orgId`, `targetDay`, `rowsWritten`, `durationMs`, and `attempts`.

Severity guide:

- **Sev2 / page:** a production dashboard or daily value story is unavailable, materially stale, or at risk of data loss.
- **Sev3 / ticket:** a single source, org, or operational path needs same-day operator action.
- **Sev4 / backlog:** early warning or capacity hygiene that should be handled before the next release or capacity cycle.

Tune thresholds to your schedule and support model. For the default daily collector, a 26-hour freshness threshold allows one missed or delayed run to page before the second scheduled run is due.

| Alert | Signal | Severity | Threshold / window | Source | Suggested KQL / CLI | Operator response |
| --- | --- | --- | --- | --- | --- | --- |
| Failed collector job | `ingestion_run.status IN ('failed', 'partial')`, non-zero Container Apps Job execution, or collector logs with a terminal error. | Sev2 if all orgs or P0 sources fail; Sev3 for one source/org. | Any failed scheduled execution or failed run row in the last schedule window. | Postgres `ingestion_run`; collector job execution logs; Container Apps Job execution status. | SQL: recent collector attempts above. KQL: "Collector errors and failed jobs". CLI: `az containerapp job execution list --resource-group <rg> --name <collectorJobName> --output table`. | Review `error_message`, run logs, GitHub status, token scopes, rate limits, and recent deployments. Fix root cause, then rerun the affected collector scope or backfill the affected day. |
| Stuck collector run | `ingestion_run.status = 'running'` with an old `started_at`, or a job execution still running beyond expected duration. | Sev3; Sev2 if it blocks the next scheduled run or all sources. | More than 2x normal p95 duration, or 2 hours to start. | Postgres `ingestion_run`; Container Apps Job execution status. | SQL: stuck collector attempts above. CLI: `az containerapp job execution list --resource-group <rg> --name <collectorJobName> --output table`. | Check whether the job is still active, whether DB locks or GitHub throttling are delaying it, and whether the process crashed before finalizing the row. Clear only after confirming no active writer remains, then rerun idempotently. |
| Stale silver ingestion | No successful `ingestion_run` for a source/org inside the freshness window. | Sev2 for P0 sources used by Overview, Cost, Adoption, Code Generation, Pull Requests, or Settings; Sev3 for preview sources. | `last_success_at < now() - 26 hours` for daily jobs. Adjust for custom schedules. | Postgres `ingestion_run`; optional exported `IngestionRunCustomTable`. | SQL: stale data candidates above. KQL: "No successful ingestion in N hours". | Confirm the scheduler fired, database connectivity is healthy, GitHub credentials are valid, and rate limits are available. Rerun collector/backfill for the stale source and org after fixing the cause. |
| Stale gold data | `fact_value_daily` or `fact_roi_daily` lags latest `fact_org_daily` by more than one day, or gold rows are absent for an org with recent silver data. | Sev2 when Overview value/ROI is stale for production orgs; Sev3 for one non-critical org. | Gold max `day` is more than one day behind silver max `day`, or no gold row for the latest completed daily ingestion. | Postgres gold facts: `fact_value_daily`, `fact_roi_daily`; silver fact `fact_org_daily`. | SQL: stale gold data candidates above. If exported, use the same shape in a custom Log Analytics table. | Stop treating value/ROI as current. Check the gold rebuild/value computation step, recent knob changes, and migration/deployment logs. Recompute gold for affected org/date ranges after the silver data is confirmed. |
| Web readiness degraded | `/api/health` returns HTTP `503`, `readiness = degraded`, or `checks.db != ok`; App Insights request logs show health failures. | Sev2 if production web is unavailable for users; Sev3 for transient/non-production degradation. | 3 consecutive probe failures or 5 minutes of degraded readiness. | Public health endpoint; Container Apps readiness probe; App Insights or request logs. | KQL: "Web health readiness degradation from request logs". CLI: `curl --fail --silent --show-error <healthUrl>`. | Check `DATABASE_URL`, Postgres availability, firewall/private endpoint configuration, database role permissions, migration state, and recent web revisions. Do not restart solely for DB readiness failures unless liveness/process health also fails. |
| Migration failure | `pnpm db:migrate` exits non-zero, deployment logs mention failed Drizzle migrations, or a rollout stops before schema compatibility is reached. | Sev2 if blocking production deploy or leaving mixed app/schema state; Sev3 otherwise. | Any migration failure. | CI logs, trusted operator logs, deployment logs. | KQL: "Migration failures". CLI: inspect the failed CI/deployment job logs; a migration/bootstrap Container Apps Job is provisioned and run by the azd postprovision hook. | Stop the rollout, capture migration output, verify target database and schema version, and prefer a forward-fix migration unless a tested rollback/restore runbook applies. Validate `/api/health` and collector checks before resuming. |
| Repeated GitHub API failures | Collector `github request` logs show repeated `4xx`, `5xx`, `429`, retry exhaustion, or rate-limit sleeps. | Sev2 for repeated `401`/`403` across all orgs or sustained schedule-impacting `429`/`5xx`; Sev3 for localized endpoint errors. | Error rate above 5% for 15 minutes, 3 retry-exhausted requests in a run, any repeated auth failure, or rate-limit sleep that pushes the job past its window. | Collector structured logs; GitHub status page; optional rate-limit metadata fields. | KQL: "GitHub API error and rate-limit trend". | Check token validity/scopes, org/enterprise access, endpoint changes, GitHub service health, and retry settings. Keep collector concurrency at 1 until the documented deadlock issue is fixed, stagger orgs if needed, then rerun missed scopes. |
| Postgres storage pressure | Azure Database for PostgreSQL storage metric approaches capacity. | Sev3 at warning; Sev2 when near exhaustion. | Warn at 80% for 30 minutes; page at 90% for 10 minutes. | Azure Monitor metrics for PostgreSQL Flexible Server. | KQL: "Postgres storage and connection pressure". CLI: `az monitor metrics list --resource <postgresResourceId> --metric storage_percent --interval PT5M --aggregation Maximum --output table`. | Increase storage or SKU as needed, investigate fact/bronze-related growth, confirm retention jobs, and avoid destructive cleanup without an approved data-retention decision. |
| Postgres connection pressure | `active_connections` remains high, `connections_failed` rises, or web/collector logs show sustained DB connection errors. | Sev2 if users or collector cannot connect; Sev3 for early pressure. | Active connections above 80% of the configured limit for 15 minutes, any sustained `connections_failed` over 5 minutes, or matching app log bursts. | Azure Monitor PostgreSQL metrics; web/collector logs; `/api/health`. | KQL: "Postgres storage and connection pressure" and "DB connectivity failures in app logs". CLI: `az monitor metrics list --resource <postgresResourceId> --metric active_connections,connections_failed --interval PT5M --aggregation Maximum --output table`. | Check app revisions, connection pool sizing, stuck collectors, database restarts/failovers, firewall/DNS, and credential rotation. Reduce overlapping jobs before scaling connection limits. |
| Bronze storage pressure | Azure Files share or local `BRONZE_DIR` storage approaches quota/capacity. | Sev3 at warning; Sev2 when writes may fail. | Warn at 80% of `bronzeShareQuotaGb`; page at 90% or any bronze write failure. | Azure Files share mounted at `BRONZE_DIR`; storage metrics; collector bronze write errors. | KQL: "Bronze storage pressure". CLI: `az storage share stats --account-name <storageAccount> --name bronze --auth-mode login --output json`. | Clean expired bronze only according to configured retention, increase `bronzeShareQuotaGb`, verify collector mount health, and consider moving bronze to more durable managed storage before capacity blocks ingestion. |

## Example Log Analytics queries

Exact table and column names depend on the deployment. For Azure Container Apps, console logs often land in a table similar to `ContainerAppConsoleLogs_CL` with a log-message column such as `Log_s`. Application Insights request logs may use `requests` or `AppRequests`. Replace placeholder table/column names before using these queries.

### Collector errors and failed jobs

```kusto
<CollectorLogsTable>
| where TimeGenerated > ago(24h)
| extend line = coalesce(tostring(Log_s), tostring(Message), tostring(RenderedDescription))
| where line has_any ("\"level\":50", "failed", "GitHub request failed", "ECONN", "timeout")
| project TimeGenerated, ContainerAppName = tostring(ContainerAppName_s), Revision = tostring(RevisionName_s), line
| order by TimeGenerated desc
```


### Structured ingestion-run finalize signal

The provisioned ingestion alerts use the collector's stable `ingestion_run_finalized` JSON log marker from Container Apps console logs. This query shows failed or stale ingestion by source and org without relying on a custom exported `ingestion_run` table.

```kusto
let FreshnessWindow = 26h;
let Runs =
    ContainerAppConsoleLogs
    | where TimeGenerated > ago(7d)
    | extend line = coalesce(tostring(column_ifexists("Log", "")), tostring(column_ifexists("Log_s", "")), tostring(column_ifexists("Message", "")), tostring(column_ifexists("RenderedDescription", "")))
    | extend payload = parse_json(line)
    | where tostring(payload.event) == "ingestion_run_finalized"
    | extend status = tostring(payload.status),
             source = tostring(payload.source),
             orgId = tostring(payload.orgId),
             targetDay = tostring(payload.targetDay),
             rowsWritten = tolong(payload.rowsWritten),
             durationMs = tolong(payload.durationMs),
             attempts = tolong(payload.attempts);
let Failed =
    Runs
    | where TimeGenerated > ago(FreshnessWindow)
    | where status in ("failed", "partial")
    | project TimeGenerated, source, orgId, targetDay, status, rowsWritten, durationMs, attempts, problem = "failed";
let Stale =
    Runs
    | where status == "success"
    | summarize TimeGenerated = max(TimeGenerated), latestTargetDay = max(targetDay) by source, orgId
    | where TimeGenerated < ago(FreshnessWindow)
    | project TimeGenerated, source, orgId, targetDay = latestTargetDay, status = "stale", rowsWritten = tolong(""), durationMs = tolong(""), attempts = tolong(""), problem = "stale";
Failed
| union Stale
| order by TimeGenerated desc
```

### GitHub API error and rate-limit trend

```kusto
<CollectorLogsTable>
| where TimeGenerated > ago(24h)
| extend line = coalesce(tostring(Log_s), tostring(Message), tostring(RenderedDescription))
| extend json = parse_json(line)
| extend msg = tostring(json.msg),
         status = toint(json.status),
         durationMs = toint(json.durationMs),
         remaining = toint(json.remaining)
| where (msg == "github request" and status >= 400)
    or msg has "rate limit"
    or line has "429"
| summarize requests = count(),
            p95DurationMs = percentile(durationMs, 95),
            minRemaining = min(remaining)
  by bin(TimeGenerated, 15m), status, msg
| order by TimeGenerated desc
```

### Web health readiness degradation from request logs

```kusto
<WebRequestsTable>
| where TimeGenerated > ago(6h)
| where tostring(Url) has "/api/health" or tostring(Name) has "/api/health"
| extend resultCode = tostring(ResultCode)
| summarize total = count(),
            degraded = countif(resultCode == "503"),
            ok = countif(resultCode == "200")
  by bin(TimeGenerated, 5m)
| where degraded > 0
| order by TimeGenerated desc
```

### DB connectivity failures in app logs

```kusto
<WebAndCollectorLogsTable>
| where TimeGenerated > ago(6h)
| extend line = coalesce(tostring(Log_s), tostring(Message), tostring(RenderedDescription))
| where line has_any ("database", "postgres", "DATABASE_URL", "connection", "ECONNREFUSED", "timeout")
  and line has_any ("error", "failed", "degraded")
| project TimeGenerated, App = tostring(ContainerAppName_s), line
| order by TimeGenerated desc
```

### Migration failures

```kusto
<DeploymentOrJobLogsTable>
| where TimeGenerated > ago(7d)
| extend line = coalesce(tostring(Log_s), tostring(Message), tostring(RenderedDescription))
| where line has_any ("db:migrate", "drizzle", "migration")
  and line has_any ("failed", "error", "rollback", "relation", "constraint")
| project TimeGenerated, App = tostring(ContainerAppName_s), line
| order by TimeGenerated desc
```

### No successful ingestion in N hours

If you export `ingestion_run` to Log Analytics as a custom table, keep one row per run with typed fields for source, org, status, timestamps, rows, and attempts.

```kusto
let FreshnessWindow = 26h;
<IngestionRunCustomTable>
| where status_s == "success"
| summarize lastSuccess = max(completed_at_t),
            latestDay = max(target_day_s)
  by source_s, org_id_s
| where lastSuccess < ago(FreshnessWindow)
| project source_s, org_id_s, lastSuccess, latestDay, staleFor = now() - lastSuccess
| order by staleFor desc
```

### Stale gold data

If you export silver/gold freshness to Log Analytics, keep one row per org/day/table with typed fields. The query below assumes a custom table with `org_id_s`, `table_s`, and `day_t`.

```kusto
let AllowedLag = 1d;
let RecentSilver =
    <FactFreshnessCustomTable>
    | where table_s == "fact_org_daily"
    | summarize latestSilverDay = max(day_t) by org_id_s;
let ValueGold =
    <FactFreshnessCustomTable>
    | where table_s == "fact_value_daily"
    | summarize latestValueDay = max(day_t) by org_id_s;
let RoiGold =
    <FactFreshnessCustomTable>
    | where table_s == "fact_roi_daily"
    | summarize latestRoiDay = max(day_t) by org_id_s;
RecentSilver
| join kind=leftouter ValueGold on org_id_s
| join kind=leftouter RoiGold on org_id_s
| where latestSilverDay > ago(3d)
| where isnull(latestValueDay)
    or isnull(latestRoiDay)
    or latestValueDay < latestSilverDay - AllowedLag
    or latestRoiDay < latestSilverDay - AllowedLag
| project org_id_s, latestSilverDay, latestValueDay, latestRoiDay
```

### Postgres storage and connection pressure

Exact metric names can vary by Azure API version. Verify available metrics with `az monitor metrics list-definitions --resource <postgresResourceId>`.

```kusto
<AzureMetricsTable>
| where TimeGenerated > ago(6h)
| where ResourceProvider =~ "MICROSOFT.DBFORPOSTGRESQL"
| where MetricName in ("storage_percent", "active_connections", "connections_failed")
| summarize maxValue = max(Maximum),
            avgValue = avg(Average)
  by Resource, MetricName, bin(TimeGenerated, 5m)
| where (MetricName == "storage_percent" and maxValue >= 80)
    or (MetricName == "connections_failed" and maxValue > 0)
    or (MetricName == "active_connections" and maxValue > 0)
| order by TimeGenerated desc
```

For `active_connections`, compare `maxValue` to the connection limit for the deployed Postgres SKU before paging.

### Bronze storage pressure

Azure Monitor may expose storage capacity at the account or file-service level depending on metric export configuration. Compare used GiB to the configured `bronzeShareQuotaGb` parameter.

```kusto
<AzureMetricsTable>
| where TimeGenerated > ago(24h)
| where ResourceProvider =~ "MICROSOFT.STORAGE"
| where MetricName in ("FileCapacity", "UsedCapacity")
| summarize maxBytes = max(Maximum) by Resource, MetricName, bin(TimeGenerated, 30m)
| extend usedGiB = maxBytes / 1024.0 / 1024.0 / 1024.0
| order by TimeGenerated desc
```

### Example CLI probes

These read-only commands are useful for manual triage or smoke checks. Replace placeholders with Bicep outputs such as `healthUrl`, `collectorJobName`, `postgresServerName`, and `storage.accountName`.

```bash
# Web readiness. Inspect the JSON body for readiness=ok and checks.db=ok.
curl --fail --silent --show-error <healthUrl>

# Recent collector job executions.
az containerapp job execution list \
  --resource-group <resourceGroup> \
  --name <collectorJobName> \
  --query "[].{name:name,status:properties.status,start:properties.startTime,end:properties.endTime}" \
  --output table

# Postgres pressure metrics.
az monitor metrics list \
  --resource <postgresResourceId> \
  --metric storage_percent,active_connections,connections_failed \
  --interval PT5M \
  --aggregation Maximum \
  --output table

# Bronze Azure Files usage. Compare shareUsageBytes to bronzeShareQuotaGb.
az storage share stats \
  --account-name <storageAccount> \
  --name bronze \
  --auth-mode login \
  --query "{usedBytes:shareUsageBytes}" \
  --output json
```

## Logging do/don't

Do log operational metadata that helps correlate failures without exposing sensitive data:

- `run_id`, `source`, `org_id`, `target_day`, `status`, `attempts`, duration, and `rows_written`.
- Sanitized error class/message and non-secret GitHub HTTP status codes.
- Rate-limit metadata such as remaining count, reset epoch, and sleep duration.
- Bronze path when the path does not expose secrets; treat org slugs and local paths as internal operational data.

Do not log:

- GitHub tokens, dashboard passwords, database URLs, Key Vault secret values, or authorization headers.
- Raw `.env` files, connection strings, signed download URLs, or URL query strings that may contain provider-issued signatures.
- Raw GitHub API payloads, NDJSON rows, per-user activity payloads, or copied bronze file contents.
- Full request/response bodies for auth, billing, AI credits, or user-level metrics.
- Stack traces or error objects before checking that nested causes do not include credentials or raw payloads.

The collector logger uses pino and redacts common token/header fields (`githubToken`, `token`, `headers.authorization`, and `Authorization`). Keep that redaction list current if new secret field names are introduced, and prefer adding structured fields over concatenating raw objects into message strings.

## P1 exit-criteria mapping

| P1 observability requirement | Where this guidance maps |
| --- | --- |
| Health/readiness checks exist and are documented | `/api/health` behavior and probe recommendations. |
| Collector run status, checkpoints, failures, and stale data are observable | `ingestion_run` column guide, status SQL, stale/stuck queries, and ingestion runs API note. |
| Structured logs avoid tokens, credentials, and sensitive payloads | Logging do/don't and pino redaction notes. |
| Log Analytics queries or dashboards cover failed ingestion, stale data, migration failures, and web availability | KQL examples for collector failures, stale ingestion, stale gold data, migration failures, DB errors, GitHub API errors, Postgres pressure, bronze storage, and health readiness. |
| Alerting guidance covers failed scheduled runs, repeated API errors, storage exhaustion, and stale gold/data | P1 alert catalog with signal, severity, threshold/window, source, suggested KQL/CLI, and operator response, plus provisioned Azure Monitor alert rules behind `enableAlerts` / `enableAvailabilityTest`. |
| Web and collector health are observable through documented checks and logs | Combined health endpoint, collector audit table, logs, SQL, and KQL guidance. |
