import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPercent, formatHours } from '@/lib/format';
describe('formatters', () => { it('formats currencies', () => expect(formatCurrency(1234, 'USD')).toContain('$1,234')); it('formats percents with one decimal', () => expect(formatPercent(0.432)).toBe('43.2%')); it('formats hours', () => expect(formatHours(12.3)).toBe('12h')); });
