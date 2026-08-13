import { DateRangePicker } from './date-range-picker';
import { NavLink } from './nav-link';
import { OrgSwitcher } from './org-switcher';
import { headers } from 'next/headers';
import { hasAuthenticatedRequest } from '@/lib/auth';
import { authEnabled } from '@/lib/env';
import { Button } from '../ui/button';
import { ThemeToggle } from '../theme-toggle';

const links = [
  ['/getting-started', 'Setup'],
  ['/overview', 'Overview'],
  ['/adoption', 'Adoption'],
  ['/code-generation', 'Code Generation'],
  ['/pull-requests', 'PRs'],
  ['/cost', 'Cost & Spend'],
  ['/consumption', 'Consumption (Preview)'],
  ['/calculator', 'Calculator'],
  ['/settings', 'Settings'],
  ['/delivery', 'Delivery (Preview)'],
  ['/engineering-health', 'Eng Health (Preview)'],
] as const;

export async function TopNav({ orgId }: { orgId?: string }) {
  const showSignOut = authEnabled && (await hasAuthenticatedRequest(await headers()));

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex min-h-16 items-center gap-4 px-6">
        <OrgSwitcher orgId={orgId} />
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {links.map(([href, label]) => (
            <NavLink key={href} href={href}>
              {label}
            </NavLink>
          ))}
        </div>
        <DateRangePicker />
        <ThemeToggle />
        {showSignOut ? (
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        ) : null}
      </div>
    </nav>
  );
}
