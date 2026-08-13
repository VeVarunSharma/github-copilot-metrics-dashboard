import { describe, expect, it } from 'vitest';
import { authenticateRequestHeaders, readTrustedIdentity } from '@/lib/auth-request';

describe('auth request helpers', () => {
  it('honors the configured identity header only in identity-header mode', async () => {
    const headers = new Headers({ 'x-ms-client-principal-name': 'operator@example.com' });
    const source = { AUTH_MODE: 'identity-header' };

    expect(readTrustedIdentity(headers, source)).toBe('operator@example.com');
    await expect(authenticateRequestHeaders(headers, source)).resolves.toEqual({
      ok: true,
      mode: 'identity-header',
      subject: 'operator@example.com',
    });
  });

  it('ignores identity headers in open mode', async () => {
    const headers = new Headers({ 'x-ms-client-principal-name': 'spoofed@example.com' });
    const source = { AUTH_MODE: 'open' };

    expect(readTrustedIdentity(headers, source)).toBeUndefined();
    await expect(authenticateRequestHeaders(headers, source)).resolves.toEqual({ ok: true, mode: 'open' });
  });

  it('ignores identity headers in shared-password mode', async () => {
    const headers = new Headers({ 'x-ms-client-principal-name': 'spoofed@example.com' });
    const source = { AUTH_MODE: 'shared-password', DASHBOARD_PASSWORD: 'secret' };

    expect(readTrustedIdentity(headers, source)).toBeUndefined();
    await expect(authenticateRequestHeaders(headers, source)).resolves.toEqual({ ok: false, mode: 'shared-password' });
  });
});
