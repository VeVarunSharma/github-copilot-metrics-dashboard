#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/lib.sh"

require_env AZURE_LOCATION >/dev/null
require_env POSTGRES_ADMIN_USERNAME >/dev/null
require_env POSTGRES_ADMIN_PASSWORD >/dev/null
require_env GITHUB_TOKEN >/dev/null
require_env DASHBOARD_PASSWORD >/dev/null
require_env WEB_READONLY_PASSWORD >/dev/null
require_env COLLECTOR_WRITER_PASSWORD >/dev/null
require_env MIGRATION_ADMIN_PASSWORD >/dev/null

github_orgs="$(get_env_value GITHUB_ORGS)"
github_enterprise="$(get_env_value GITHUB_ENTERPRISE)"
[ -n "$github_orgs" ] || [ -n "$github_enterprise" ] || fail 'Set GITHUB_ORGS or GITHUB_ENTERPRISE for collector scope.'

web_pw="$(get_env_value WEB_READONLY_PASSWORD)"
collector_pw="$(get_env_value COLLECTOR_WRITER_PASSWORD)"
migration_pw="$(get_env_value MIGRATION_ADMIN_PASSWORD)"
[ ${#web_pw} -ge 16 ] || fail 'WEB_READONLY_PASSWORD must be at least 16 characters.'
[ ${#collector_pw} -ge 16 ] || fail 'COLLECTOR_WRITER_PASSWORD must be at least 16 characters.'
[ ${#migration_pw} -ge 16 ] || fail 'MIGRATION_ADMIN_PASSWORD must be at least 16 characters.'
[ "$web_pw" != "$collector_pw" ] && [ "$web_pw" != "$migration_pw" ] && [ "$collector_pw" != "$migration_pw" ] || fail 'Database role passwords must be distinct.'

if is_true "$(get_env_value ENABLE_ENTRA_AUTH)"; then
  require_env ENTRA_CLIENT_ID >/dev/null
  require_env ENTRA_CLIENT_SECRET >/dev/null
fi

if is_true "$(get_env_value ENABLE_ALERTS)"; then
  email="$(get_env_value ALERT_EMAIL_RECEIVER)"
  webhook="$(get_env_value ALERT_WEBHOOK_RECEIVER_URL)"
  [ -n "$email" ] || [ -n "$webhook" ] || fail 'ENABLE_ALERTS=true requires ALERT_EMAIL_RECEIVER or ALERT_WEBHOOK_RECEIVER_URL.'
fi

info 'preprovision validation passed (secrets were not printed).'
