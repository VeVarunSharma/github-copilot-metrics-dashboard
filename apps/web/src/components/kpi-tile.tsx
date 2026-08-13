import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatValue } from '@/lib/format';
import { HowCalculatedPanel } from './how-calculated-panel';
import { CopilotBadge } from './copilot-badge';

type Metric = React.ComponentProps<typeof HowCalculatedPanel>['metric'];

interface KpiTileProps {
  label: string;
  value: number | null;
  format: 'hours' | 'dollars' | 'percent' | 'ratio' | 'raw';
  hint?: string;
  currency?: string;
  howCalculated?: { metric?: Metric; formula?: string; inputs: Record<string, number | string> };
  trend?: { delta: number; direction: 'up' | 'down' };
  href?: string;
  sparkline?: Array<number | null>;
  /** Marks the tile as Copilot-attributed — renders the Copilot badge (DESIGN.md). */
  copilot?: boolean;
}

function Sparkline({ points }: { points: Array<number | null> }) {
  const defined = points.filter((p): p is number => p != null);
  if (defined.length < 2) return null;
  const min = Math.min(...defined);
  const max = Math.max(...defined);
  const span = max - min || 1;
  const width = 96;
  const height = 24;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const segments: string[] = [];
  let open = false;
  points.forEach((p, i) => {
    if (p == null) {
      open = false;
      return;
    }
    const x = i * step;
    const y = height - ((p - min) / span) * height;
    segments.push(`${open ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
    open = true;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-6 w-full text-primary" preserveAspectRatio="none" aria-hidden>
      <path d={segments.join(' ')} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiTile({ label, value, format, hint, howCalculated, trend, currency = 'USD', href, sparkline, copilot }: KpiTileProps) {
  const card = (
    <Card className="h-full transition-colors hover:border-foreground/20">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
          {copilot ? <CopilotBadge /> : null}
        </div>
        {howCalculated ? (
          <HowCalculatedPanel metric={howCalculated.metric ?? 'dollars-saved-mtd'} inputs={howCalculated.inputs} />
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums tracking-tight">
          {value == null ? '—' : formatValue(value, format, currency)}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        {trend ? (
          <p
            className={
              trend.direction === 'up'
                ? 'mt-1 text-xs font-medium text-success'
                : 'mt-1 text-xs font-medium text-destructive'
            }
          >
            {trend.direction === 'up' ? '↑' : '↓'} {formatValue(Math.abs(trend.delta), format, currency)}
          </p>
        ) : null}
        {sparkline ? <Sparkline points={sparkline} /> : null}
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {card}
      </Link>
    );
  }
  return card;
}
