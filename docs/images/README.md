# Screenshots

Product screenshots referenced by the top-level [`README.md`](../../README.md) live in this folder.

They are intentionally generated from the **demo dataset** (no GitHub credentials required), so
anyone can reproduce the same kind of capture. The seeded dates follow the run date,
so exact pixels and totals may vary between captures.

## Regenerate the screenshots

1. Seed demo data and run the app locally (see the root README quickstart):

   ```bash
   pnpm smoke:demo
   pnpm build
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

3. Inspect the resulting PNGs for rendering completion, selected org/dates, synthetic-data labels, and sensitive browser/environment details before committing. The root README embeds the Overview, Cost & Spend, and Adoption captures.

If Chromium is already installed, the same capture can be made without installing a package:

```bash
for view in overview cost adoption code-generation pull-requests calculator; do
  chromium --headless --disable-gpu --disable-dev-shm-usage \
    --window-size=1440,1100 --virtual-time-budget=8000 \
    --screenshot="$PWD/docs/images/${view}.png" \
    "http://localhost:3000/${view}?orgId=demo-org"
done
```

Run from the checkout root as a normal, sandboxed desktop user. Isolated CI containers running as root may require `--no-sandbox`; use that only in a disposable synthetic-data capture environment, never for browsing customer content.

Do not hide security or freshness warnings for marketing. Keep the auth-disabled banner visible in open-mode captures. If using protected mode, authenticate normally before capture. Never capture customer data, tokens, cloud resource identifiers, or browser profile information.

## Recording and acceptance

Use the five-minute script in the root README. Include captions, identify the synthetic dataset, show one calculation explanation and Calculator sensitivity change, and end with the workshop CTA. A video is not currently included; record and review it before claiming a video asset exists.
