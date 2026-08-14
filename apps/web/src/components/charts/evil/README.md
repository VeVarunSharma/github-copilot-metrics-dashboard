# EvilCharts components

EvilCharts registry components live under `apps/web/src/components/charts/evil/`.

Import chart primitives from `@/components/charts/evil/charts/...`, for example:

```tsx
import { EvilLineChart, Line, XAxis, YAxis, Grid, Tooltip } from '@/components/charts/evil/charts/line-chart';
```

Shared EvilCharts internals live in `@/components/charts/evil/ui/...`.

## Theme integration

Use chart configs whose `colors.light` and `colors.dark` values reference our CSS variables. **Reserved semantics (see `/DESIGN.md`):** `hsl(var(--chart-copilot-1))` / `--chart-copilot-2` are for **Copilot-attributed** series only; `hsl(var(--chart-value))` is the headline value (green); `hsl(var(--chart-baseline))` / `--chart-neutral` are non-Copilot baselines. For general (non-attributed) series use the categorical ramp `--chart-1 … --chart-10`. Tooltip surfaces use `bg-tooltip text-tooltip-foreground`; axes and gridlines inherit shadcn/Tailwind `muted-foreground` and `border` styling.

## When to use

Use EvilCharts for new chart views. Keep existing `src/components/charts/*.tsx` wrappers in place for existing views until an intentional upgrade is planned.
