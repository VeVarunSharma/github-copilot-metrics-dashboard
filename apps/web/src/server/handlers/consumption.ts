import { queryConsumptionPatterns } from '../queries/consumption';

export async function consumptionPatternsHandler({ query }: { query: { orgId: string; from: string; to: string } }) {
  return { status: 200 as const, body: await queryConsumptionPatterns(query.orgId, query) };
}
