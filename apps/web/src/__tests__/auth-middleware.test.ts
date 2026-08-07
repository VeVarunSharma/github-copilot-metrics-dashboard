import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const originalAuthMode = process.env.AUTH_MODE;
const originalDashboardPassword = process.env.DASHBOARD_PASSWORD;
const originalIdentityHeader = process.env.AUTH_IDENTITY_HEADER;

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

  if (originalIdentityHeader === undefined) {
    delete process.env.AUTH_IDENTITY_HEADER;
  } else {
    process.env.AUTH_IDENTITY_HEADER = originalIdentityHeader;
  }
}

function setAuthEnv(values: { AUTH_MODE?: string; DASHBOARD_PASSWORD?: string; AUTH_IDENTITY_HEADER?: string }) {
  delete process.env.AUTH_MODE;
  delete process.env.DASHBOARD_PASSWORD;
  delete process.env.AUTH_IDENTITY_HEADER;
  Object.assign(process.env, values);
}

function request(pathname: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), init);
}

async function loadMiddleware() {
  vi.resetModules();
  return import('../middleware');
}

function expectNext(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('x-middleware-next')).toBe('1');
}

describe('auth middleware', () => {
  afterEach(() => {
    restoreAuthEnv();
    vi.resetModules();
  });

  it('keeps public paths open in shared-password mode', async () => {
    setAuthEnv({ AUTH_MODE: 'shared-password', DASHBOARD_PASSWORD: 'secret' });
    const { middleware } = await loadMiddleware();

    for (const pathname of ['/calculator', '/login', '/api/health']) {
      expectNext(await middleware(request(pathname)));
    }
  });

  it('keeps public paths open in identity-header mode', async () => {
    setAuthEnv({ AUTH_MODE: 'identity-header' });
    const { middleware } = await loadMiddleware();

    for (const pathname of ['/calculator', '/login', '/api/health']) {
      expectNext(await middleware(request(pathname)));
    }
  });

  it('allows open mode without trusting identity headers as auth', async () => {
    setAuthEnv({});
    const { middleware } = await loadMiddleware();

    expectNext(await middleware(request('/overview')));
    expectNext(await middleware(request('/api/settings', { headers: { 'x-ms-client-principal-name': 'user@example.com' } })));
  });

  it('protects dashboard pages and APIs in shared-password mode', async () => {
    setAuthEnv({ AUTH_MODE: 'shared-password', DASHBOARD_PASSWORD: 'secret' });
    const [{ middleware }, { cookieName, createSessionCookieValue }] = await Promise.all([
      loadMiddleware(),
      import('../lib/auth-session'),
    ]);

    const pageResponse = await middleware(request('/overview'));
    expect(pageResponse.status).toBe(307);
    expect(pageResponse.headers.get('location')).toBe('http://localhost:3000/login');

    const spoofedIdentityResponse = await middleware(request('/overview', { headers: { 'x-ms-client-principal-name': 'user@example.com' } }));
    expect(spoofedIdentityResponse.status).toBe(307);
    expect(spoofedIdentityResponse.headers.get('location')).toBe('http://localhost:3000/login');

    const apiResponse = await middleware(request('/api/settings'));
    expect(apiResponse.status).toBe(401);

    const sessionCookie = await createSessionCookieValue('secret');
    expectNext(await middleware(request('/overview', { headers: { cookie: `${cookieName}=${sessionCookie}` } })));
  });

  it('allows only explicitly configured identity headers in identity-header mode', async () => {
    setAuthEnv({ AUTH_MODE: 'identity-header', AUTH_IDENTITY_HEADER: 'x-ms-client-principal-name' });
    const { middleware } = await loadMiddleware();

    expectNext(await middleware(request('/overview', { headers: { 'x-ms-client-principal-name': 'user@example.com' } })));

    const pageResponse = await middleware(request('/overview'));
    expect(pageResponse.status).toBe(401);
    expect(pageResponse.headers.get('location')).toBeNull();

    const apiResponse = await middleware(request('/api/settings'));
    expect(apiResponse.status).toBe(401);
  });
});
