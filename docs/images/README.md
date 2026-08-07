# Screenshots

Product screenshots referenced by the top-level [`README.md`](../../README.md) live in this folder.

They are intentionally generated from the **demo dataset** (no GitHub credentials required), so
anyone can reproduce them deterministically.

## Regenerate the screenshots

1. Seed demo data and run the app locally (see the root README quickstart):

   ```bash
   pnpm db:seed:demo
   BUILD_STANDALONE= pnpm --filter @ghcp-dash/web build
   DATABASE_URL="postgres://ghcp:ghcp@localhost:5432/ghcp_metrics" AUTH_MODE=open \
     pnpm --filter @ghcp-dash/web start
   ```

2. Capture the flagship views with Playwright (one-time `npx playwright install chromium`):

   ```bash
   for view in overview cost adoption code-generation pull-requests calculator; do
     npx playwright screenshot \
       --viewport-size=1440,900 --wait-for-timeout=2500 \
       "http://localhost:3000/${view}?orgId=demo-org" "docs/images/${view}.png"
   done
   ```

3. Commit the resulting PNGs. The README embeds `docs/images/overview.png` (and peers) once present.

> Tip: for a marketing-grade capture, set `DASHBOARD_PASSWORD`/`AUTH_MODE` so the "auth disabled"
> banner is hidden, and refresh the demo seed so the freshness banner is green.
