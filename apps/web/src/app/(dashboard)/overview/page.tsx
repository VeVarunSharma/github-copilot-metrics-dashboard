import { OverviewView } from '@/views/overview-view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) { return <OverviewView searchParams={await searchParams} />; }
