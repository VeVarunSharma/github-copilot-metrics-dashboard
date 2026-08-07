import { queryEngineeringHealth } from '../queries/engineering-health';

export async function engineeringHealthHandler({ query }: { query: { orgId: string; from: string; to: string } }) {
  return { status: 200 as const, body: await queryEngineeringHealth(query.orgId, query) };
}
