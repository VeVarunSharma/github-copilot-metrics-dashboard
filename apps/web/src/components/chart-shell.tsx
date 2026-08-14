import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { EmptyState } from './empty-state';

interface ChartShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ChartShell({ title, description, children, empty, emptyTitle = 'No data for this range', emptyDescription = 'Try a wider date range or run the collector for more days.' }: ChartShellProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pb-4">{empty ? <EmptyState title={emptyTitle} description={emptyDescription} /> : children}</CardContent>
    </Card>
  );
}
