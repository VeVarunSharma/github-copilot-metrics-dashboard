import { afterEach, describe, expect, it, vi } from 'vitest';

const originalAuthMode = process.env.AUTH_MODE;
const originalDashboardPassword = process.env.DASHBOARD_PASSWORD;

function restoreAuthEnv() {
  if (originalAuthMode === undefined) {
    delete process.env.AUTH_MODE;
  } else {
    process.env.AUTH_MODE = originalAuthMode;
  }

  if (originalDashboardPassword === undefined) {
    delete process.env.DASHBOARD_PASSWORD;
  } else {
    process.env.DASHBOARD_PASSWORD = originalDashboardPassword;
  }
}

async function postLogout() {
  vi.resetModules();
  const { POST } = await import('@/app/api/auth/logout/route');
  return POST(new Request('http://localhost:3000/api/auth/logout', { method: 'POST' }));
}

describe('auth logout route', () => {
  afterEach(() => {
    restoreAuthEnv();
    vi.resetModules();
  });

  it('redirects identity-header logout to the platform EasyAuth sign-out endpoint', async () => {
    process.env.AUTH_MODE = 'identity-header';
    delete process.env.DASHBOARD_PASSWORD;

    const response = await postLogout();

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/.auth/logout?post_logout_redirect_uri=/login%3FloggedOut%3D1');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('keeps shared-password logout on the in-app login page', async () => {
    process.env.AUTH_MODE = 'shared-password';
    process.env.DASHBOARD_PASSWORD = 'secret';

    const response = await postLogout();

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?loggedOut=1');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
