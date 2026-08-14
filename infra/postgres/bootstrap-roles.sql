-- Copilot Metrics Dashboard PostgreSQL role bootstrap.
--
-- Purpose:
--   Create/update least-privilege login roles for the runtime components:
--     * web_readonly      - dashboard reads plus the current Settings write exception
--     * collector_writer  - ingestion/gold rebuild writes, no DDL
--     * migration_admin   - trusted migration/seed runner, DDL-capable within this DB
--
-- Run with psql as the PostgreSQL server admin, database owner, or another trusted
-- bootstrap principal. Passwords are supplied as psql variables so secrets are not
-- committed to this file:
--
--   psql "$ADMIN_DATABASE_URL" \
--     -v web_readonly_password="$WEB_READONLY_PASSWORD" \
--     -v collector_writer_password="$COLLECTOR_WRITER_PASSWORD" \
--     -v migration_admin_password="$MIGRATION_ADMIN_PASSWORD" \
--     -f infra/postgres/bootstrap-roles.sql
--
-- Safe repeatability:
--   * The script runs in one transaction and stops on the first error.
--   * Existing roles have their passwords/options refreshed.
--   * Grants are applied only to tables that exist, so this can be run before
--     migrations to create migration_admin, and rerun after migrations/seeds to
--     apply table grants.
--
-- Important:
--   If migrations have already been run by another owner, migration_admin receives
--   DML privileges but may not be able to ALTER owner-controlled tables. For clean
--   deployments, run this script first, then run pnpm db:migrate with the
--   migration_admin DATABASE_URL so new objects are owned by migration_admin.
--
-- Legacy upgrade ownership transfer:
--   Default clean-deploy behavior does not change ownership. For a trusted,
--   operator-approved upgrade of a pre-existing database whose app objects are
--   owned by another role, opt in explicitly:
--
--     psql "$ADMIN_DATABASE_URL" \
--       -v web_readonly_password="$WEB_READONLY_PASSWORD" \
--       -v collector_writer_password="$COLLECTOR_WRITER_PASSWORD" \
--       -v migration_admin_password="$MIGRATION_ADMIN_PASSWORD" \
--       -v reassign_owner=true \
--       -v reassign_owner_from="<legacy_owner_optional>" \
--       -f infra/postgres/bootstrap-roles.sql
--
--   When reassign_owner_from is supplied, REASSIGN OWNED runs first for that
--   role in the current database. The script then attempts targeted ALTER OWNER
--   statements for objects in the public and drizzle app schemas.

\set ON_ERROR_STOP on

\if :{?reassign_owner}
\else
\set reassign_owner false
\endif

\if :{?reassign_owner_from}
\else
\set reassign_owner_from ''
\endif

BEGIN;

-- Required psql variables. These SET LOCAL statements intentionally fail when a
-- caller omits a password variable.
SET LOCAL "copilot_dash.bootstrap.web_readonly_password" = :'web_readonly_password';
SET LOCAL "copilot_dash.bootstrap.collector_writer_password" = :'collector_writer_password';
SET LOCAL "copilot_dash.bootstrap.migration_admin_password" = :'migration_admin_password';
SET LOCAL "copilot_dash.bootstrap.reassign_owner" = :'reassign_owner';
SET LOCAL "copilot_dash.bootstrap.reassign_owner_from" = :'reassign_owner_from';

DO $roles$
DECLARE
  web_password text := current_setting('copilot_dash.bootstrap.web_readonly_password');
  collector_password text := current_setting('copilot_dash.bootstrap.collector_writer_password');
  migration_password text := current_setting('copilot_dash.bootstrap.migration_admin_password');
BEGIN
  IF length(web_password) < 16 OR web_password ILIKE 'change_me%' OR web_password LIKE '<%' THEN
    RAISE EXCEPTION 'web_readonly_password must be a real secret at least 16 characters long';
  END IF;
  IF length(collector_password) < 16 OR collector_password ILIKE 'change_me%' OR collector_password LIKE '<%' THEN
    RAISE EXCEPTION 'collector_writer_password must be a real secret at least 16 characters long';
  END IF;
  IF length(migration_password) < 16 OR migration_password ILIKE 'change_me%' OR migration_password LIKE '<%' THEN
    RAISE EXCEPTION 'migration_admin_password must be a real secret at least 16 characters long';
  END IF;
  IF web_password = collector_password OR web_password = migration_password OR collector_password = migration_password THEN
    RAISE EXCEPTION 'Use distinct passwords for web_readonly, collector_writer, and migration_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_readonly') THEN
    EXECUTE format('CREATE ROLE web_readonly LOGIN PASSWORD %L', web_password);
  ELSE
    EXECUTE format('ALTER ROLE web_readonly LOGIN PASSWORD %L', web_password);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'collector_writer') THEN
    EXECUTE format('CREATE ROLE collector_writer LOGIN PASSWORD %L', collector_password);
  ELSE
    EXECUTE format('ALTER ROLE collector_writer LOGIN PASSWORD %L', collector_password);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_admin') THEN
    EXECUTE format('CREATE ROLE migration_admin LOGIN PASSWORD %L', migration_password);
  ELSE
    EXECUTE format('ALTER ROLE migration_admin LOGIN PASSWORD %L', migration_password);
  END IF;

  EXECUTE 'ALTER ROLE web_readonly NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION';
  EXECUTE 'ALTER ROLE collector_writer NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION';
  EXECUTE 'ALTER ROLE migration_admin NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION';
  EXECUTE 'ALTER ROLE web_readonly SET search_path = public';
  EXECUTE 'ALTER ROLE collector_writer SET search_path = public';
  EXECUTE 'ALTER ROLE migration_admin SET search_path = public';
END;
$roles$;

DO $database_grants$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO web_readonly', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO collector_writer', current_database());
  EXECUTE format('GRANT CONNECT, CREATE ON DATABASE %I TO migration_admin', current_database());
END;
$database_grants$;

-- Prevent accidental object creation through PUBLIC while preserving normal schema
-- usage for explicitly granted roles.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM web_readonly;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM collector_writer;

GRANT USAGE ON SCHEMA public TO web_readonly;
GRANT USAGE ON SCHEMA public TO collector_writer;
GRANT USAGE, CREATE ON SCHEMA public TO migration_admin;

-- Ownership transfer is intentionally opt-in for legacy upgrades only. Clean azd
-- deployments already create migrated objects as migration_admin and should not
-- need ownership rewrites.
DO $legacy_owner_transfer$
DECLARE
  should_reassign boolean := lower(current_setting('copilot_dash.bootstrap.reassign_owner')) IN ('true', '1', 'yes', 'y', 'on');
  legacy_owner text := nullif(current_setting('copilot_dash.bootstrap.reassign_owner_from'), '');
  object_record record;
BEGIN
  IF NOT should_reassign THEN
    RETURN;
  END IF;

  IF legacy_owner IS NOT NULL THEN
    IF legacy_owner = 'migration_admin' THEN
      RAISE NOTICE 'Skipping REASSIGN OWNED because reassign_owner_from is already migration_admin';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = legacy_owner) THEN
      EXECUTE format('REASSIGN OWNED BY %I TO migration_admin', legacy_owner);
    ELSE
      RAISE EXCEPTION 'reassign_owner_from role "%" does not exist', legacy_owner;
    END IF;
  END IF;

  FOR object_record IN
    SELECT n.nspname AS schema_name
    FROM pg_namespace n
    WHERE n.nspname IN ('public', 'drizzle')
  LOOP
    EXECUTE format('ALTER SCHEMA %I OWNER TO migration_admin', object_record.schema_name);
  END LOOP;

  FOR object_record IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS object_name,
      CASE c.relkind
        WHEN 'S' THEN 'SEQUENCE'
        WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED VIEW'
        WHEN 'f' THEN 'FOREIGN TABLE'
        ELSE 'TABLE'
      END AS object_type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'drizzle')
      AND c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
  LOOP
    EXECUTE format('ALTER %s %I.%I OWNER TO migration_admin', object_record.object_type, object_record.schema_name, object_record.object_name);
  END LOOP;

  FOR object_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS function_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'drizzle')
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) OWNER TO migration_admin', object_record.schema_name, object_record.function_name, object_record.function_arguments);
  END LOOP;
END;
$legacy_owner_transfer$;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM web_readonly;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM collector_writer;

DO $table_grants$
DECLARE
  app_tables text[] := ARRAY[
    'dim_org',
    'dim_user',
    'dim_team',
    'dim_feature',
    'dim_ide',
    'dim_language',
    'dim_model',
    'dim_repo',
    'fact_org_daily',
    'fact_org_daily_by_feature',
    'fact_org_daily_by_ide',
    'fact_org_daily_by_language_feature',
    'fact_org_daily_by_language_model',
    'fact_org_daily_by_model_feature',
    'fact_user_daily',
    'fact_user_daily_by_feature',
    'fact_user_daily_by_ide',
    'fact_user_daily_by_language_feature',
    'fact_user_daily_by_language_model',
    'fact_user_daily_by_model_feature',
    'bridge_user_team',
    'fact_billing_daily',
    'fact_ai_credits_daily',
    'fact_release_daily',
    'fact_workflow_run_daily',
    'fact_commit_daily',
    'fact_value_daily',
    'fact_roi_daily',
    'fact_team_value_daily',
    'fact_dora_daily',
    'fact_ci_daily',
    'ingestion_run',
    'settings'
  ];
  collector_write_tables text[] := ARRAY[
    'dim_org',
    'dim_user',
    'dim_team',
    'dim_feature',
    'dim_ide',
    'dim_language',
    'dim_model',
    'dim_repo',
    'fact_org_daily',
    'fact_org_daily_by_feature',
    'fact_org_daily_by_ide',
    'fact_org_daily_by_language_feature',
    'fact_org_daily_by_language_model',
    'fact_org_daily_by_model_feature',
    'fact_user_daily',
    'fact_user_daily_by_feature',
    'fact_user_daily_by_ide',
    'fact_user_daily_by_language_feature',
    'fact_user_daily_by_language_model',
    'fact_user_daily_by_model_feature',
    'bridge_user_team',
    'fact_billing_daily',
    'fact_ai_credits_daily',
    'fact_release_daily',
    'fact_workflow_run_daily',
    'fact_commit_daily',
    'fact_value_daily',
    'fact_roi_daily',
    'fact_team_value_daily',
    'ingestion_run'
  ];
  collector_delete_tables text[] := ARRAY[
    'fact_value_daily',
    'fact_roi_daily',
    'fact_team_value_daily'
  ];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM web_readonly', table_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM collector_writer', table_name);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO web_readonly', table_name);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO collector_writer', table_name);
    ELSE
      RAISE NOTICE 'Skipping read grants for public.%, table does not exist yet', table_name;
    END IF;
  END LOOP;

  -- The dashboard is otherwise read-only. Current Settings behavior writes the
  -- value_translation_knobs row through INSERT ... ON CONFLICT DO UPDATE, so
  -- settings receives a narrow table/column write exception.
  IF to_regclass('public.settings') IS NOT NULL THEN
    EXECUTE 'GRANT INSERT ("key", "value", "updated_at"), UPDATE ("value", "updated_at") ON TABLE public.settings TO web_readonly';
  END IF;

  FOREACH table_name IN ARRAY collector_write_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('GRANT INSERT, UPDATE ON TABLE public.%I TO collector_writer', table_name);
    ELSE
      RAISE NOTICE 'Skipping collector write grants for public.%, table does not exist yet', table_name;
    END IF;
  END LOOP;

  FOREACH table_name IN ARRAY collector_delete_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('GRANT DELETE ON TABLE public.%I TO collector_writer', table_name);
    END IF;
  END LOOP;
END;
$table_grants$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO migration_admin;

DO $drizzle_schema_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle') THEN
    EXECUTE 'GRANT USAGE, CREATE ON SCHEMA drizzle TO migration_admin';
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA drizzle TO migration_admin';
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA drizzle TO migration_admin';
  END IF;
END;
$drizzle_schema_grants$;

COMMIT;
