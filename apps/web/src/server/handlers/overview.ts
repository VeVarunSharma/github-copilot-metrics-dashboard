import { queryOverview } from '../queries/overview';
export async function overviewHandler({ query }: { query: { orgId: string; from: string; to: string } }) { return { status: 200 as const, body: await queryOverview(query.orgId, query) }; }
