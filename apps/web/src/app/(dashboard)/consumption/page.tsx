import { ConsumptionView } from '@/views/consumption-view';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ConsumptionView searchParams={await searchParams} />;
}
