import { queryCodeGeneration } from '../queries/code-generation';
export async function codeGenerationHandler({ query }: { query: { orgId: string; from: string; to: string } }) { return { status: 200 as const, body: await queryCodeGeneration(query.orgId, query) }; }
