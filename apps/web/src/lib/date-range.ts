export interface DateRange { from: string; to: string }
function ymd(date: Date) { return date.toISOString().slice(0, 10); }
export function defaultDateRange(now = new Date()): DateRange {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(to); from.setUTCDate(from.getUTCDate() - 27);
  return { from: ymd(from), to: ymd(to) };
}
export function parseDateRange(searchParams?: Record<string, string | string[] | undefined>): DateRange {
  const defaults = defaultDateRange();
  const from = typeof searchParams?.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from) ? searchParams.from : defaults.from;
  const to = typeof searchParams?.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.to) ? searchParams.to : defaults.to;
  return { from, to };
}
export function daysInRange({ from, to }: DateRange) {
  const start = new Date(`${from}T00:00:00Z`); const end = new Date(`${to}T00:00:00Z`);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}
