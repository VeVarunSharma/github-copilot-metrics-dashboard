import { AdoptionView } from '@/views/adoption-view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) { return <AdoptionView searchParams={await searchParams} />; }
