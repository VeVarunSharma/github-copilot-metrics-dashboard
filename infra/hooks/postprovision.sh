#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
. "$SCRIPT_DIR/lib.sh"

require_command psql
require_command pnpm
require_command node
require_command az

postgres_fqdn="$(require_env POSTGRES_FQDN)"
database_name="$(get_env_value POSTGRES_DATABASE_NAME)"
[ -n "$database_name" ] || database_name="$(get_env_value DATABASE_NAME)"
[ -n "$database_name" ] || database_name='ghcp_metrics'
postgres_admin_username="$(require_env POSTGRES_ADMIN_USERNAME)"
postgres_admin_password="$(require_env POSTGRES_ADMIN_PASSWORD)"
web_password="$(require_env WEB_READONLY_PASSWORD)"
collector_password="$(require_env COLLECTOR_WRITER_PASSWORD)"
migration_password="$(require_env MIGRATION_ADMIN_PASSWORD)"
key_vault_name="$(require_env KEY_VAULT_NAME)"

admin_url="$(postgres_url "$postgres_admin_username" "$postgres_admin_password" "$postgres_fqdn" "$database_name")"
web_url="$(postgres_url web_readonly "$web_password" "$postgres_fqdn" "$database_name")"
collector_url="$(postgres_url collector_writer "$collector_password" "$postgres_fqdn" "$database_name")"
migration_url="$(postgres_url migration_admin "$migration_password" "$postgres_fqdn" "$database_name")"

run_bootstrap() {
  info 'running PostgreSQL role/grant bootstrap'
  psql "$admin_url" \
    -v web_readonly_password="$web_password" \
    -v collector_writer_password="$collector_password" \
    -v migration_admin_password="$migration_password" \
    -f "$PROJECT_DIR/infra/postgres/bootstrap-roles.sql" >/dev/null
}

run_bootstrap

info 'updating Key Vault database URL secrets with least-privilege role URLs'
az keyvault secret set --vault-name "$key_vault_name" --name web-database-url --value "$web_url" --output none
az keyvault secret set --vault-name "$key_vault_name" --name collector-database-url --value "$collector_url" --output none
az keyvault secret set --vault-name "$key_vault_name" --name migration-database-url --value "$migration_url" --output none

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
