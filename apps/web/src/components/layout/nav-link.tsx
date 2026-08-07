'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { hrefPathname, hrefWithOrgId } from '@/lib/org-url-state';
import { cn } from '@/lib/utils';
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const orgId = useSearchParams().get('orgId');
  const resolvedHref = hrefWithOrgId(href, orgId);
  return <Link href={resolvedHref} className={cn('rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground', pathname === hrefPathname(href) && 'bg-secondary font-semibold text-foreground')}>{children}</Link>;
}
