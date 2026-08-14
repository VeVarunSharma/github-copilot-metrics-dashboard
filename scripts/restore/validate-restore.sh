#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    die "$name is required"
  fi
}

if [[ ! -f package.json || ! -d apps/collector ]]; then
  die "run this script from the repository root"
fi

require_var RESTORE_TARGET_NON_PROD_CONFIRM
require_var DATABASE_URL
require_var GITHUB_TOKEN

if [[ "$RESTORE_TARGET_NON_PROD_CONFIRM" != "restore-to-new-non-production-server" ]]; then
  die "set RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server to confirm validation targets non-production"
fi

if [[ -z "${GITHUB_ORGS:-}" && -z "${GITHUB_ENTERPRISE:-}" ]]; then
  die "set GITHUB_ORGS or GITHUB_ENTERPRISE; collector gold currently loads collector configuration"
fi

if ! command -v psql >/dev/null 2>&1; then
  die "psql is required"
fi
if ! command -v curl >/dev/null 2>&1; then
  die "curl is required"
fi
if ! command -v node >/dev/null 2>&1; then
  die "node is required"
fi

if [[ -z "${WEB_HEALTH_URL:-}" ]]; then
  require_var WEB_BASE_URL
  WEB_HEALTH_URL="${WEB_BASE_URL%/}/api/health"
fi

REQUIRE_NONZERO_COUNTS="${REQUIRE_NONZERO_COUNTS:-true}"

run_counts() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -P pager=off <<'SQL'
with counts(table_name, row_count) as (
  select 'dim_org', count(*) from dim_org
  union all select 'ingestion_run', count(*) from ingestion_run
  union all select 'fact_org_daily', count(*) from fact_org_daily
  union all select 'fact_user_daily', count(*) from fact_user_daily
  union all select 'fact_billing_daily', count(*) from fact_billing_daily
  union all select 'fact_ai_credits_daily', count(*) from fact_ai_credits_daily
  union all select 'fact_value_daily', count(*) from fact_value_daily
  union all select 'fact_roi_daily', count(*) from fact_roi_daily
)
select table_name, row_count
from counts
order by table_name;

select source, org_id, max(target_day) as latest_success_day, max(completed_at) as latest_completed_at
from ingestion_run
where status = 'success'
group by source, org_id
order by org_id, source;
SQL
}

log "Checking restored database row counts before gold rebuild"
run_counts

if [[ "$REQUIRE_NONZERO_COUNTS" == "true" ]]; then
  log "Verifying required restored tables are non-empty"
  nonzero_result="$(
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
with required(table_name, row_count) as (
  select 'dim_org', count(*) from dim_org
  union all select 'ingestion_run', count(*) from ingestion_run
  union all select 'fact_org_daily', count(*) from fact_org_daily
  union all select 'fact_value_daily', count(*) from fact_value_daily
  union all select 'fact_roi_daily', count(*) from fact_roi_daily
)
select coalesce(string_agg(table_name, ', ' order by table_name), '')
from required
where row_count = 0;
SQL
  )"
  if [[ -n "$nonzero_result" ]]; then
    die "required restored tables are empty: $nonzero_result"
  fi
fi

log "Rebuilding gold tables from restored silver"
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold --concurrency 1

log "Checking restored database row counts after gold rebuild"
run_counts

log "Checking web health endpoint: $WEB_HEALTH_URL"
health_body="$(curl -fsS "$WEB_HEALTH_URL")"
HEALTH_BODY="$health_body" node <<'NODE'
const body = JSON.parse(process.env.HEALTH_BODY ?? '{}');
if (body.readiness !== 'ok') {
  console.error(`Expected readiness ok, got ${body.readiness ?? '<missing>'}`);
  process.exit(1);
}
if (body.staleDataStatus !== 'fresh') {
  console.error(`Expected staleDataStatus fresh, got ${body.staleDataStatus ?? '<missing>'}`);
  process.exit(1);
}
console.log(JSON.stringify({
  status: body.status,
  readiness: body.readiness,
  staleDataStatus: body.staleDataStatus,
  lastSuccessfulIngestionTargetDay: body.lastSuccessfulIngestionTargetDay,
  lastSuccessfulIngestionCompletedAt: body.lastSuccessfulIngestionCompletedAt
}, null, 2));
NODE

log "Restore validation completed successfully."
