# @ghcp-dash/collector

Node CLI that ingests GitHub Copilot metrics, billing usage, and AI credits into the dashboard Postgres schema. It writes raw bronze NDJSON before silver upserts, tracks `ingestion_run`, and rebuilds gold value tables.

## Environment

- `GITHUB_TOKEN` — classic PAT with `read:org` and `manage_billing:copilot`
- `GITHUB_ORGS` — comma-separated org slugs
- `DATABASE_URL` — Postgres connection string
- Optional: `GITHUB_API_BASE_URL`, `BRONZE_DIR`, `LOG_LEVEL`

## Commands

```bash
pnpm --filter @ghcp-dash/collector start
pnpm --filter @ghcp-dash/collector backfill --from 2025-10-10 --to 2026-06-19
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts seed
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts gold
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts export-parquet --out ./exports
pnpm --filter @ghcp-dash/collector exec tsx src/index.ts collect --check
```

Common flags: `--dry-run`, `--concurrency N`, `--verbose`, `--max-retries N`.

## Troubleshooting

- Missing scopes: recreate the PAT with both required scopes.
- 204 responses are normal for empty days and are recorded as `no_content`.
- Backfills are idempotent; successful `(source, org, day)` work is skipped.
- AI credits and billing 404s are treated as feature-unavailable, not fatal.
