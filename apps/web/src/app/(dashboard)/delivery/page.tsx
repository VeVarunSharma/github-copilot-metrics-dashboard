import { DeliveryView } from '@/views/delivery-view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) { return <DeliveryView searchParams={await searchParams} />; }
