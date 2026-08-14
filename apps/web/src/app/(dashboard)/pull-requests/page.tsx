import { PullRequestsView } from '@/views/pull-requests-view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) { return <PullRequestsView searchParams={await searchParams} />; }
