export function pickUrlOrgId(
  orgs: ReadonlyArray<{ id: string }>,
  requestedOrgId: string | null | undefined,
  fallbackOrgId: string | null,
): string | null {
  if (requestedOrgId && orgs.some((org) => org.id === requestedOrgId)) return requestedOrgId;
  return fallbackOrgId;
}

export function hrefWithOrgId(href: string, orgId: string | null | undefined): string {
  if (!orgId || !href.startsWith('/')) return href;

  const url = new URL(href, 'https://dashboard.local');
  url.searchParams.set('orgId', orgId);
  return `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
}

export function hrefPathname(href: string): string {
  if (!href.startsWith('/')) return href;
  return new URL(href, 'https://dashboard.local').pathname;
}
