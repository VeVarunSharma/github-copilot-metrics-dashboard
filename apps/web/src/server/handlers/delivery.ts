import { queryDelivery } from '../queries/delivery';

export async function deliveryHandler({ query }: { query: { orgId: string; from: string; to: string } }) {
  return { status: 200 as const, body: await queryDelivery(query.orgId, query) };
}
