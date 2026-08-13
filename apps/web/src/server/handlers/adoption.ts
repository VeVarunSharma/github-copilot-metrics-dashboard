import { queryAdoption } from '../queries/adoption';
export async function adoptionHandler({ query }: { query: { orgId: string; from: string; to: string } }) { return { status: 200 as const, body: await queryAdoption(query.orgId, query) }; }
