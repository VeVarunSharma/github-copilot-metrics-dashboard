import { queryPullRequests } from '../queries/pull-requests';
export async function pullRequestsHandler({ query }: { query: { orgId: string; from: string; to: string } }) { return { status: 200 as const, body: await queryPullRequests(query.orgId, query) }; }
