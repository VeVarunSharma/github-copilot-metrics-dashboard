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
require_var BRONZE_DIR
require_var FROM_DATE
require_var TO_DATE

if [[ "$RESTORE_TARGET_NON_PROD_CONFIRM" != "restore-to-new-non-production-server" ]]; then
  die "set RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server to confirm this writes only to a restored non-production database"
fi

if [[ -z "${GITHUB_ORGS:-}" && -z "${GITHUB_ENTERPRISE:-}" && -z "${ORGS:-}" && -z "${ENTERPRISE:-}" ]]; then
  die "set GITHUB_ORGS/GITHUB_ENTERPRISE or ORGS/ENTERPRISE for collector scope"
fi

CONCURRENCY="${CONCURRENCY:-1}"
CHECK_BRONZE_COVERAGE="${CHECK_BRONZE_COVERAGE:-true}"
WITH_DELIVERY="${WITH_DELIVERY:-false}"
VERBOSE="${VERBOSE:-false}"

if [[ "$CONCURRENCY" != "1" ]]; then
  log "WARNING: collector concurrency is '$CONCURRENCY'; production guidance is --concurrency 1 until dimension upsert deadlocks are fixed"
fi

if [[ "$CHECK_BRONZE_COVERAGE" == "true" ]]; then
  log "Checking retained bronze directory exists and contains NDJSON files"
  [[ -d "$BRONZE_DIR" ]] || die "BRONZE_DIR does not exist: $BRONZE_DIR"
  if ! find "$BRONZE_DIR" -type f -name '*.ndjson' -print -quit | grep -q .; then
    die "no retained bronze NDJSON files found under BRONZE_DIR"
  fi
  log "Sample retained bronze paths for operator evidence:"
  find "$BRONZE_DIR" -type f \( -name "$FROM_DATE.ndjson" -o -name "$TO_DATE.ndjson" -o -name '*.ndjson' \) -print | sed 's#^\./##' | awk 'NR <= 20 { print }'
fi

log "Running idempotent collector backfill for $FROM_DATE through $TO_DATE"
log "Current collector CLI re-collects source data and writes/uses BRONZE_DIR as the durable bronze location; reruns are safe by ingestion_run checkpointing and silver upserts."

cmd=(
  pnpm collect:backfill
  --from "$FROM_DATE"
  --to "$TO_DATE"
  --concurrency "$CONCURRENCY"
)

if [[ -n "${ORGS:-}" ]]; then
  cmd+=(--orgs "$ORGS")
fi
if [[ -n "${ENTERPRISE:-}" ]]; then
  cmd+=(--enterprise "$ENTERPRISE")
fi
if [[ "$WITH_DELIVERY" == "true" ]]; then
  cmd+=(--with-delivery)
fi
if [[ "$VERBOSE" == "true" ]]; then
  cmd+=(--verbose)
fi

"${cmd[@]}"

log "Backfill completed. Rebuilding gold to ensure restored silver reflects current value settings."
gold_cmd=(pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold --concurrency 1)
if [[ "$VERBOSE" == "true" ]]; then
  gold_cmd+=(--verbose)
fi
"${gold_cmd[@]}"

log "Bronze/backfill phase completed for restored non-production database."
