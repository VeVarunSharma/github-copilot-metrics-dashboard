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

require_var SOURCE_RESOURCE_GROUP
require_var SOURCE_SERVER_NAME
require_var TARGET_SERVER_NAME
require_var RESTORE_TARGET_NON_PROD_CONFIRM

TARGET_RESOURCE_GROUP="${TARGET_RESOURCE_GROUP:-$SOURCE_RESOURCE_GROUP}"
RESTORE_MODE="${RESTORE_MODE:-pitr}"

if [[ "$RESTORE_TARGET_NON_PROD_CONFIRM" != "restore-to-new-non-production-server" ]]; then
  die "set RESTORE_TARGET_NON_PROD_CONFIRM=restore-to-new-non-production-server to confirm the target is new/non-production"
fi

if [[ "$SOURCE_SERVER_NAME" == "$TARGET_SERVER_NAME" ]]; then
  die "TARGET_SERVER_NAME must be different from SOURCE_SERVER_NAME"
fi

if ! command -v az >/dev/null 2>&1; then
  die "az CLI is required"
fi

log "Checking Azure CLI authentication"
az account show --only-show-errors >/dev/null
SOURCE_SUBSCRIPTION_ID="${SOURCE_SUBSCRIPTION_ID:-$(az account show --query id --output tsv --only-show-errors)}"
SOURCE_SERVER_REF="${SOURCE_SERVER_ID:-/subscriptions/$SOURCE_SUBSCRIPTION_ID/resourceGroups/$SOURCE_RESOURCE_GROUP/providers/Microsoft.DBforPostgreSQL/flexibleServers/$SOURCE_SERVER_NAME}"

log "Verifying target server '$TARGET_SERVER_NAME' does not already exist in '$TARGET_RESOURCE_GROUP'"
if az postgres flexible-server show \
  --resource-group "$TARGET_RESOURCE_GROUP" \
  --name "$TARGET_SERVER_NAME" \
  --only-show-errors >/dev/null 2>&1; then
  die "target server already exists; this script only restores into a new non-production server"
fi

case "$RESTORE_MODE" in
  pitr)
    require_var RESTORE_TIME_UTC
    log "Starting point-in-time restore to new server '$TARGET_SERVER_NAME' at '$RESTORE_TIME_UTC'"
    cmd=(
      az postgres flexible-server restore
      --resource-group "$TARGET_RESOURCE_GROUP"
      --name "$TARGET_SERVER_NAME"
      --source-server "$SOURCE_SERVER_REF"
      --restore-time "$RESTORE_TIME_UTC"
      --only-show-errors
      --output table
    )
    if [[ -n "${LOCATION:-}" ]]; then
      cmd+=(--location "$LOCATION")
    fi
    "${cmd[@]}"
    ;;
  geo)
    require_var LOCATION
    log "Starting geo-restore to new server '$TARGET_SERVER_NAME' in '$LOCATION'"
    az postgres flexible-server geo-restore \
      --resource-group "$TARGET_RESOURCE_GROUP" \
      --name "$TARGET_SERVER_NAME" \
      --source-server "$SOURCE_SERVER_REF" \
      --location "$LOCATION" \
      --only-show-errors \
      --output table
    ;;
  *)
    die "RESTORE_MODE must be 'pitr' or 'geo'"
    ;;
esac

log "Restore command completed. Fetching target server state."
az postgres flexible-server show \
  --resource-group "$TARGET_RESOURCE_GROUP" \
  --name "$TARGET_SERVER_NAME" \
  --query '{name:name,resourceGroup:resourceGroup,state:state,version:version,location:location,fullyQualifiedDomainName:fullyQualifiedDomainName}' \
  --only-show-errors \
  --output table

log "Next: create non-production database URLs/secrets for the restored server before running migration checks, backfill, or web health validation."
