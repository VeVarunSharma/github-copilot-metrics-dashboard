export const REPORT_START_DAY = '2025-10-10';
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function yesterdayUtc(now = new Date()): string {
  return formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY_MS));
}

export function todayUtc(now = new Date()): string {
  return formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

export function addDays(day: string, days: number): string {
  return formatDate(new Date(new Date(`${day}T00:00:00.000Z`).getTime() + days * DAY_MS));
}

export function dateRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let current = from; current <= to; current = formatDate(new Date(new Date(`${current}T00:00:00.000Z`).getTime() + DAY_MS))) {
    days.push(current);
  }
  return days;
}

export function clampFromDate(requested: string, now = new Date()): { from: string; clamped: boolean; min: string } {
  const oneYearAgo = formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 365 * DAY_MS));
  const min = oneYearAgo > REPORT_START_DAY ? oneYearAgo : REPORT_START_DAY;
  return requested < min ? { from: min, clamped: true, min } : { from: requested, clamped: false, min };
}

export function assertDate(value: string, name: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error(`${name} must be a valid YYYY-MM-DD date`);
  }
}
