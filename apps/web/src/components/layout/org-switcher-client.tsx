'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { OrgRow } from '@ghcp-dash/contracts';
import { pickUrlOrgId } from '@/lib/org-url-state';

export function OrgSwitcherClient({ orgs, current }: { orgs: OrgRow[]; current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentOrgId = pickUrlOrgId(orgs, searchParams.get('orgId'), current);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('orgId', next);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (orgs.length === 0) {
    return <span className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">no orgs · seed first</span>;
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">org</span>
      <select
        value={currentOrgId ?? ''}
        onChange={handleChange}
        className="min-w-48 rounded-md border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
