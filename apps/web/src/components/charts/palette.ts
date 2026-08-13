/**
 * Categorical chart palette — a diverse, colorblind-aware ramp of 10 theme-aware
 * hues (defined as `--chart-1 … --chart-10` in globals.css, with light + dark
 * variants). Used two ways:
 *   1. Multi-series charts cycle it by series index (`chartColors[i % n]`).
 *   2. Single-series *categorical* charts (bars/treemap/pie by IDE, model,
 *      language, feature, workflow…) color each category by row index.
 *
 * Single-metric *time-series* charts intentionally do NOT use this — they stay
 * on a single accent (`--chart-value`, GitHub Green) so colour never implies
 * meaning that isn't there (spec 04 §design conventions). Copilot-attributed
 * series use the reserved `--chart-copilot-1` (Copilot Purple) instead.
 */
export const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
];

/** Pick a categorical colour by index, wrapping around the ramp. */
export function categoricalColor(index: number): string {
  return chartColors[index % chartColors.length] ?? chartColors[0]!;
}
