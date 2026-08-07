import { queryOrgs } from '../queries/orgs';
export async function orgsHandler() { return { status: 200 as const, body: await queryOrgs() }; }
