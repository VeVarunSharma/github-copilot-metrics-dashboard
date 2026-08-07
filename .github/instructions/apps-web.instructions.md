---
applyTo: 'apps/web/**'
---

# `apps/web` — Next.js dashboard

Path-scoped rules for the dashboard. Read first: [`AGENTS.md`](../../AGENTS.md), [`specs/CONSTITUTION.md`](../../specs/CONSTITUTION.md), [`specs/03-architecture.md`](../../specs/03-architecture.md), [`specs/04-ui-and-views.md`](../../specs/04-ui-and-views.md).

## Architecture rules

- **Server components by default.** Use `'use client'` only when a component needs interactivity (charts, forms, the calculator, the org switcher dropdown).
- **All HTTP endpoints MUST be defined in `packages/contracts`** as ts-rest contracts. No raw `fetch('/api/...')` in views or components. (Constitution Principle 7.)
- **The web app is read-only against the database.** It MUST NOT make outbound GitHub API calls. (Constitution Principle 3.)
- **Data flows**: server components call `src/server/queries/*.ts` directly via Drizzle. Client components call `src/server/handlers/*.ts` via the ts-rest client.

## File placement

| Concern | Where it lives |
| --- | --- |
| Page bodies (substantive logic) | `src/views/<name>-view.tsx` |
| Route wrappers (thin) | `src/app/(dashboard)/<name>/page.tsx` |
| ts-rest server handlers | `src/server/handlers/<name>.ts` |
| Drizzle queries | `src/server/queries/<name>.ts` |
| Reusable UI primitives | `src/components/ui/` (shadcn-style, copied source) |
| Layout shell | `src/components/layout/` |
| Chart components | `src/components/charts/<chart-type>.tsx` (client components) |
| Date / format / helpers | `src/lib/` |

## Org id resolution

- **Never hardcode `'default'`** as a fallback orgId. It matches no real org.
- All dashboard views MUST call `resolveOrgId(searchParams?.orgId)` from `src/lib/resolve-org.ts`. It returns the requested org if real, else prefers `demo-org`, else the most-recently-active org, else `null`.
- If `resolveOrgId` returns `null`, render `<EmptyState>` with the seed command instructions.

## UI rules

- **Follow the design system** in [`../../DESIGN.md`](../../DESIGN.md) (Constitution Principle 11). Consume `globals.css` / Tailwind tokens — never hardcode hex. Green is the scarce hero; **Copilot Purple is reserved for Copilot-attributed data** (use the Copilot badge to mark it); inline links are blue. Every component needs a designed dark value. Charts MUST NOT encode meaning by hue alone.
- **Every derived KPI tile** (anything that ran through `packages/value`) MUST set `howCalculated` so the "How is this calculated?" ⓘ button appears. (Constitution Principle 1.)
- **No per-developer rankings** in any view. Org and team grain only. (Constitution Principle 2 / 9.)
- User logins MUST be rendered via `pseudonymize(login, salt)` from `src/lib/pseudonymize.ts` unless the admin toggle is on.
- Currency formatting via `Intl.NumberFormat` using `data.headlines.currency`, not a hardcoded `USD`.

## Performance / DX

- First contentful paint on `/overview` ≤ 1.5s (cold cache).
- No client-side fetch waterfalls — prefer server components + `Suspense`.
- Skeleton loaders for all charts; no layout shift on data load.

## Auth

- The `/calculator` and `/login` and `/api/health` routes MUST remain unauth'd even when `DASHBOARD_PASSWORD` is set.
- Middleware lives at `src/middleware.ts` and runs only when `DASHBOARD_PASSWORD` is set.

## When adding a new dashboard view

1. Add the ts-rest contract entry in `packages/contracts/src/api/` (request + response schemas).
2. Add the Drizzle query in `src/server/queries/<name>.ts`.
3. Add the ts-rest server handler in `src/server/handlers/<name>.ts` (mounted automatically via the `[[...ts-rest]]` route).
4. Add the view body in `src/views/<name>-view.tsx`.
5. Add the route wrapper in `src/app/(dashboard)/<name>/page.tsx`.
6. Add the nav link in `src/components/layout/top-nav.tsx`.
7. Update `specs/04-ui-and-views.md` to describe the new view.
