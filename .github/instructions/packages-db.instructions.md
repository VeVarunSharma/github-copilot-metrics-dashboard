---
applyTo: 'packages/db/**'
---

# `packages/db` — Drizzle schema + seed

Path-scoped rules for the database package. Read first: [`AGENTS.md`](../../AGENTS.md), [`specs/CONSTITUTION.md`](../../specs/CONSTITUTION.md), [`specs/01-data-sources-and-model.md`](../../specs/01-data-sources-and-model.md).

## Architecture rules

- **Lakehouse-shaped schema.** Silver and gold fact tables MUST map 1:1 to OneLake delta tables. No app-only or web-only columns in fact tables. (Constitution Principle 4.)
- **Drizzle, not raw SQL.** The schema, queries, seed, and migrations all use Drizzle. The one exception is the initial migration SQL emitted by `drizzle-kit generate` — that's expected.
- **Composite primary keys** via `primaryKey({ columns: [...] })`. Foreign keys via `.references(() => otherTable.column)`.
- **`casing: 'snake_case'`** so column names match the spec exactly.
- **Use Drizzle types**: `bigint` for GitHub IDs (matches API), `numeric` for monetary amounts (precision matters), `jsonb` for `knob_snapshot` and `settings.value`, `timestamp({ withTimezone: true })` for everything that's a timestamp.

## Seed rules (`src/seed.ts`)

- **Dimensions seed MUST be idempotent and production-safe.** No fact data, no demo data, just `dim_*` + default `settings`. Uses `onConflictDoNothing`.
- **Demo seed (`--demo`)** generates 90 days of synthetic facts for a clearly-marked `demo-org` (display name prefixed with `[demo]`).
- **Demo users** MUST use `user_id ≥ 900_000_000 AND user_id < 910_000_000` so `--clear-demo` can scrub them with a single range delete.
- **Determinism**: PRNG is `mulberry32(20260619)`. Don't introduce `Math.random()` or `Date.now()` in the data generation path.
- **`--reset`** MUST require explicit `--yes` confirmation. It wipes ALL facts but preserves dims and settings.

## Migration discipline

- `pnpm db:generate` regenerates migration SQL. Diff carefully before committing — the initial migration was hand-written and a fresh generate will rewrite it.
- Schema changes are additive only on minor releases. Column drops require a major version bump and a backward-compatible deprecation window.
- The Postgres NOTICE about identifier truncation (`fact_user_daily_by_language_feature_language_dim_language_name_fk` → 63 chars) is known and non-fatal.

## Client (`src/client.ts`)

- Connection pool max defaults to 10 (configurable via `DB_MAX_CONNECTIONS`).
- `createDb(url)` is preferred for scripts that own a connection lifecycle (collector, seed).
- The lazy proxy `db` is for server-rendered pages that want a singleton.
- `pingDb(database)` is the health check primitive.

## Tests

- Schema tests live in `src/__tests__/schema.test.ts` and run without a real database — they assert structure (column names, PK composition, unique constraints).
- Integration tests requiring a real Postgres go in the collector's testcontainers harness (not implemented yet — `.skip` is acceptable until then).
