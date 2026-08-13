import { EngineeringHealthView } from '@/views/engineering-health-view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) { return <EngineeringHealthView searchParams={await searchParams} />; }
