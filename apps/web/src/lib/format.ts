export function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}
export function formatPercent(value: number) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}
export function formatHours(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0)}h`;
}
export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0);
}
export function formatRatio(value: number) {
  return `${(value || 0).toFixed(2)}×`;
}
export function formatValue(value: number, format: 'hours' | 'dollars' | 'percent' | 'ratio' | 'raw', currency = 'USD') {
  if (format === 'hours') return formatHours(value);
  if (format === 'dollars') return formatCurrency(value, currency);
  if (format === 'percent') return formatPercent(value);
  if (format === 'ratio') return formatRatio(value);
  return formatNumber(value);
}
