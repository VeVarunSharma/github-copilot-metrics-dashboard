---
applyTo: 'apps/collector/**'
---

# `apps/collector` — ingestion CLI

Path-scoped rules for the collector. Read first: [`AGENTS.md`](../../AGENTS.md), [`specs/CONSTITUTION.md`](../../specs/CONSTITUTION.md), [`specs/01-data-sources-and-model.md`](../../specs/01-data-sources-and-model.md).

## Architecture rules

- **Idempotent ingestion.** Every collector path MUST be safe to re-run for the same `(source, scope.slug, day)` without data corruption. Use `ingestion_run` for checkpointing; skip on existing successful runs. (Constitution Principle 5.)
- **Bronze before silver.** ALWAYS persist the raw NDJSON to `./data/bronze/{source}/{orgId}/{day}.ndjson` BEFORE parsing. The bronze file is the audit + replay source. (Constitution Principle 6.)
- **Scope abstraction.** Every ingestor takes a `Scope = { kind: 'org' | 'enterprise', slug }` from `src/github/scope.ts`. Never hardcode `/orgs/` or `/enterprises/` URL prefixes — use `scopeUrls.*` builders.
- **`ensureOrgExists` before any FK-referencing insert.** The `ingestion_run.org_id` FK requires a `dim_org` row to exist. The common helpers do this; preserve it.
- **`process.exit()` at the end of `src/index.ts`** is intentional — the postgres connection pool keeps the event loop alive otherwise. Do not remove.

## Empty-day / 204 handling

- A `204 No Content` from any metrics endpoint MUST be treated as "successfully zero". Write an `ingestion_run` row with `status = 'no_content'` and `rows_written = 0`. Do NOT retry. Do NOT error.
- A `404` from the AI Credits endpoint MUST be treated as "feature unavailable for this org" via the `allow404` flag and `FeatureUnavailableError`. Same outcome as 204.

## Backfill rules

- `--from` MUST be clamped to `MAX(2025-10-10, today − 365d)` per spec 01 §3.2.
- A warning MUST be emitted when clamping occurs.

## Auth scopes

- Token scope validation happens in `src/github/auth.ts` via `validateToken(client, scopes)`.
- Required scopes are derived from the configured `Scope[]` via `requiredScopesFor()`. Org scope wants `read:org`; enterprise scope wants `read:enterprise` OR `manage_billing:copilot`.
- Billing endpoints additionally need `manage_billing:copilot`. Missing this scope is a WARN, not a fatal error — billing/AI-credits ingestion just becomes a no-op (their 404s get handled).

## Concurrency

- **Default concurrency MAY be 4**, but the user MUST be able to pass `--concurrency 1` to serialize for now. Known deadlock with concurrent dim upserts; do not regress.

## When adding a new ingestor

1. Add (or reuse) the Zod schema in `packages/contracts/src/github/schemas.ts`. Mark fields `.optional()` and use `.passthrough()` liberally — real GitHub responses are looser than the docs.
2. Add the scope URL builder in `src/github/scope.ts`.
3. Add the silver upsert in `src/silver/upsert-<name>.ts` using Drizzle's `.onConflictDoUpdate()` with the natural primary key.
4. Add the ingestor in `src/ingestors/<name>.ts` using one of the common helpers (`ingestSignedNdjsonReport`, `ingestSignedNdjsonRows`, `ingestJsonResponse`).
5. Wire the ingestor into the backfill SOURCES list in `src/commands/backfill.ts`.
6. Add Vitest fixtures covering: happy path, 204, 404 (where applicable), upsert idempotency.
