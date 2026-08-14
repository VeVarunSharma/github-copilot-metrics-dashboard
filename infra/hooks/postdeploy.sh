#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=infra/hooks/lib.sh
. "$SCRIPT_DIR/lib.sh"

require_command curl
health_url="$(get_env_value HEALTH_URL)"
if [ -z "$health_url" ]; then
  web_url="$(require_env WEB_URL)"
  health_url="${web_url%/}/api/health"
fi

info 'checking deployed web /api/health endpoint'
status="$(curl -fsS -o /dev/null -w '%{http_code}' "$health_url")" || fail 'web /api/health request failed'
[ "$status" = '200' ] || fail "web /api/health returned HTTP $status"
info 'postdeploy health check succeeded.'

update_collector_job_image() {
  resource_group="$(get_env_value AZURE_RESOURCE_GROUP)"
  collector_job_name="$(get_env_value COLLECTOR_JOB_NAME)"
  collector_image="$(get_env_value SERVICE_COLLECTOR_IMAGE_NAME)"

  if [ -z "$collector_image" ]; then
    collector_image="$(get_env_value COLLECTOR_IMAGE)"
  fi

  if [ -z "$resource_group" ] || [ -z "$collector_job_name" ] || [ -z "$collector_image" ]; then
    info 'skipping collector job image fallback; AZURE_RESOURCE_GROUP, COLLECTOR_JOB_NAME, or SERVICE_COLLECTOR_IMAGE_NAME is unavailable.'
    return 0
  fi

  require_command az
  info "updating collector Container Apps Job image fallback for $collector_job_name"
  az containerapp job update \
    --resource-group "$resource_group" \
    --name "$collector_job_name" \
    --image "$collector_image" \
    --output none
}

update_collector_job_image
