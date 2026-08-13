import { queryUnitEconomics } from '../queries/unit-economics';
export async function unitEconomicsHandler({ query }: { query: { orgId: string; from: string; to: string } }) { return { status: 200 as const, body: await queryUnitEconomics(query.orgId, query) }; }
