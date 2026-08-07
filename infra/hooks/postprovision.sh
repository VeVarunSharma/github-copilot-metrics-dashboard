#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
. "$SCRIPT_DIR/lib.sh"

require_command psql
require_command pnpm
require_command node
require_command az
require_command curl

postgres_fqdn="$(require_env POSTGRES_FQDN)"
postgres_server_name="$(require_env POSTGRES_SERVER_NAME)"
resource_group="$(require_env AZURE_RESOURCE_GROUP)"
subscription_id="$(require_env AZURE_SUBSCRIPTION_ID)"
database_name="$(get_env_value POSTGRES_DATABASE_NAME)"
[ -n "$database_name" ] || database_name="$(get_env_value DATABASE_NAME)"
[ -n "$database_name" ] || database_name='ghcp_metrics'
postgres_admin_username="$(require_env POSTGRES_ADMIN_USERNAME)"
postgres_admin_password="$(require_env POSTGRES_ADMIN_PASSWORD)"
web_password="$(require_env WEB_READONLY_PASSWORD)"
collector_password="$(require_env COLLECTOR_WRITER_PASSWORD)"
migration_password="$(require_env MIGRATION_ADMIN_PASSWORD)"
key_vault_name="$(require_env KEY_VAULT_NAME)"
use_key_vault_references="$(get_env_value USE_KEY_VAULT_REFERENCES)"

admin_url="$(postgres_url "$postgres_admin_username" "$postgres_admin_password" "$postgres_fqdn" "$database_name")"
web_url="$(postgres_url web_readonly "$web_password" "$postgres_fqdn" "$database_name")"
collector_url="$(postgres_url collector_writer "$collector_password" "$postgres_fqdn" "$database_name")"
migration_url="$(postgres_url migration_admin "$migration_password" "$postgres_fqdn" "$database_name")"

bootstrap_ip="$(curl -4 -fsS https://api.ipify.org)"
node -e 'process.exit(require("node:net").isIP(process.argv[1]) === 4 ? 0 : 1)' "$bootstrap_ip" \
  || fail 'Unable to determine a valid IPv4 address for temporary PostgreSQL bootstrap access.'
firewall_rule_name="azd-bootstrap-${AZURE_ENV_NAME:-deployment}"
firewall_rule_url="https://management.azure.com/subscriptions/$subscription_id/resourceGroups/$resource_group/providers/Microsoft.DBforPostgreSQL/flexibleServers/$postgres_server_name/firewallRules/$firewall_rule_name?api-version=2022-12-01"
firewall_created=false

cleanup_firewall() {
  if [ "$firewall_created" = true ]; then
    info 'removing temporary PostgreSQL bootstrap firewall rule'
    az rest --method delete --url "$firewall_rule_url" --output none || true
  fi
}
trap cleanup_firewall EXIT HUP INT TERM

info 'temporarily allowing the current deployment client IP to bootstrap PostgreSQL'
firewall_body="$(node -e 'process.stdout.write(JSON.stringify({ properties: { startIpAddress: process.argv[1], endIpAddress: process.argv[1] } }))' "$bootstrap_ip")"
az rest --method put --url "$firewall_rule_url" --body "$firewall_body" --output none
firewall_created=true

wait_for_postgres_access() {
  attempt=1
  max_attempts=18
  while [ "$attempt" -le "$max_attempts" ]; do
    if psql "$admin_url" -v ON_ERROR_STOP=1 -Atc 'select 1' >/dev/null 2>&1; then
      info 'temporary PostgreSQL bootstrap access is ready'
      return 0
    fi
    if [ "$attempt" -eq "$max_attempts" ]; then
      fail 'Temporary PostgreSQL bootstrap access did not become ready within 180 seconds.'
    fi
    info "waiting for temporary PostgreSQL bootstrap access (attempt $attempt/$max_attempts)"
    sleep 10
    attempt=$((attempt + 1))
  done
}

run_bootstrap() {
  info 'running PostgreSQL role/grant bootstrap'
  psql "$admin_url" \
    -v web_readonly_password="$web_password" \
    -v collector_writer_password="$collector_password" \
    -v migration_admin_password="$migration_password" \
    -f "$PROJECT_DIR/infra/postgres/bootstrap-roles.sql" >/dev/null
}

wait_for_postgres_access
run_bootstrap

if [ -z "$use_key_vault_references" ] || is_true "$use_key_vault_references"; then
  info 'updating Key Vault database URL secrets with least-privilege role URLs'
  az keyvault secret set --vault-name "$key_vault_name" --name web-database-url --value "$web_url" --output none
  az keyvault secret set --vault-name "$key_vault_name" --name collector-database-url --value "$collector_url" --output none
  az keyvault secret set --vault-name "$key_vault_name" --name migration-database-url --value "$migration_url" --output none
else
  info 'Key Vault data-plane access is disabled; Bicep already stored least-privilege URL copies through the management plane'
fi

info 'running Drizzle migrations with migration_admin'
(cd "$PROJECT_DIR" && DATABASE_URL="$migration_url" DB_MAX_CONNECTIONS=1 pnpm db:migrate >/dev/null)
info 'running production-safe seed with migration_admin'
(cd "$PROJECT_DIR" && DATABASE_URL="$migration_url" DB_MAX_CONNECTIONS=1 pnpm db:seed >/dev/null)

run_bootstrap

info 'verifying database grants'
psql "$web_url" -v ON_ERROR_STOP=1 -Atc "select has_table_privilege(current_user, 'public.settings', 'SELECT')" | grep -qx t
psql "$collector_url" -v ON_ERROR_STOP=1 -Atc "select has_table_privilege(current_user, 'public.ingestion_run', 'INSERT')" | grep -qx t
psql "$migration_url" -v ON_ERROR_STOP=1 -Atc "select has_schema_privilege(current_user, 'public', 'CREATE')" | grep -qx t

info 'postprovision migration, seed, grant refresh, and grant verification succeeded.'
