import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}

const gridCols: Record<number, string> = {
  1: '',
  2: 'lg:grid-cols-2',
  3: 'md:grid-cols-2 xl:grid-cols-3',
};

export function ChartGrid({ children, cols = 2, className }: ChartGridProps) {
  return <div className={cn('grid gap-6', gridCols[cols], className)}>{children}</div>;
}
