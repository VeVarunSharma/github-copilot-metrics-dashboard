import { getOrgs } from '@/server/queries/common';
import { resolveOrgId } from '@/lib/resolve-org';
import { OrgSwitcherClient } from './org-switcher-client';

export async function OrgSwitcher({ orgId }: { orgId?: string }) {
  const { orgs } = await getOrgs();
  const current = await resolveOrgId(orgId);
  return <OrgSwitcherClient orgs={orgs} current={current} />;
}

