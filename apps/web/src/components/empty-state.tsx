import { Card, CardContent } from './ui/card';

export function EmptyState({ title = 'No data yet', description = 'Run pnpm db:seed:demo for sample data or pnpm collect to populate this view.', action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <Card className="border-dashed"><CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-8 text-center"><h3 className="font-semibold">{title}</h3><p className="max-w-md text-sm text-muted-foreground">{description}</p>{action}</CardContent></Card>;
}
