import { queryCost } from '../queries/cost';
export async function costHandler({ query }: { query: { orgId: string; from: string; to: string } }) { return { status: 200 as const, body: await queryCost(query.orgId, query) }; }
