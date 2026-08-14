import { describe, expect, it } from 'vitest';
import { hrefPathname, hrefWithOrgId, pickUrlOrgId } from '@/lib/org-url-state';

describe('org URL state helpers', () => {
  it('uses a real URL-selected org instead of the server fallback', () => {
    expect(pickUrlOrgId([{ id: 'demo-org' }, { id: 'octo-org' }], 'octo-org', 'demo-org')).toBe('octo-org');
  });

  it('falls back when the URL-selected org is not known', () => {
    expect(pickUrlOrgId([{ id: 'demo-org' }], 'missing-org', 'demo-org')).toBe('demo-org');
  });

  it('preserves orgId on internal nav links without dropping existing URL state', () => {
    expect(hrefWithOrgId('/cost?tab=unit#details', 'octo-org')).toBe('/cost?tab=unit&orgId=octo-org#details');
  });

  it('compares active links by pathname only', () => {
    expect(hrefPathname('/overview?orgId=octo-org')).toBe('/overview');
  });
});
