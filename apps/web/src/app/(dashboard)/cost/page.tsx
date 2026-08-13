import { CostView } from '@/views/cost-view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) { return <CostView searchParams={await searchParams} />; }
