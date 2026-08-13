import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KpiRowProps {
  children: ReactNode;
  /** Column count at the `lg` breakpoint. Defaults to columns auto-fitting the count of children. */
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const gridCols: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

export function KpiRow({ children, cols = 3, className }: KpiRowProps) {
  return <div className={cn('grid gap-4', gridCols[cols], className)}>{children}</div>;
}
