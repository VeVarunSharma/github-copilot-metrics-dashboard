# @ghcp-dash/web

Next.js 15 dashboard for GitHub Copilot Metrics Dashboard.

## Run locally

```bash
pnpm install
pnpm --filter @ghcp-dash/web dev
```

Set `DATABASE_URL` to connect to Postgres. Without data, pages render zero/empty states. Set `DASHBOARD_PASSWORD` to protect dashboard routes with a shared password; `/calculator`, `/login`, and `/api/health` stay public.

## Environment

- `DATABASE_URL` — Postgres connection for dashboard reads.
- `DASHBOARD_PASSWORD` — optional shared password.
- `AUTH_COOKIE_NAME` — optional cookie name override.
- `SHOW_REAL_LOGINS` — optional privacy override.

See the root README for ingestion and deployment details.
