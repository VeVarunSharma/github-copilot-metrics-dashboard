import { queryIngestionRuns } from '../queries/ingestion-runs';
export async function ingestionRunsHandler({ query }: { query: { orgId: string; from: string; to: string; limit?: number } }) { return { status: 200 as const, body: await queryIngestionRuns(query.orgId, query, query.limit) }; }
