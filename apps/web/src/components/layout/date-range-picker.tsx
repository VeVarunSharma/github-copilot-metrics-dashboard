'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { defaultDateRange } from '@/lib/date-range';
export function DateRangePicker() {
  const router = useRouter(); const params = useSearchParams(); const defaults = defaultDateRange();
  const from = params.get('from') ?? defaults.from; const to = params.get('to') ?? defaults.to;
  function setRange(nextFrom: string, nextTo: string) { const q = new URLSearchParams(params); q.set('from', nextFrom); q.set('to', nextTo); router.push(`?${q.toString()}`); }
  return <div className="flex items-center gap-2"><Input aria-label="From" className="w-36" type="date" value={from} onChange={(e) => setRange(e.target.value, to)} /><Input aria-label="To" className="w-36" type="date" value={to} onChange={(e) => setRange(from, e.target.value)} /><Button variant="outline" size="sm" onClick={() => setRange(defaults.from, defaults.to)}>28d</Button></div>;
}
