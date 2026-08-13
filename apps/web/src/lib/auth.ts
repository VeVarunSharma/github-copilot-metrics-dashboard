import { cookies } from 'next/headers';
import { authenticateRequestHeaders } from './auth-request';
import { resolveAuthMode, sharedPasswordFallbackEnabled } from './auth-config';
import { cookieName, verifySessionCookieValue } from './auth-session';

export { cookieName, createSessionCookieValue, expiredSessionCookieOptions, sessionCookieOptions, SESSION_MAX_AGE_SECONDS, verifyPassword, verifySessionCookieValue } from './auth-session';

export async function hasSessionCookie() {
  if (resolveAuthMode() === 'open') return true;
  if (!sharedPasswordFallbackEnabled()) return false;
  return verifySessionCookieValue((await cookies()).get(cookieName)?.value, process.env.DASHBOARD_PASSWORD);
}

export async function hasAuthenticatedRequest(requestHeaders: Pick<Headers, 'get'>) {
  return (await authenticateRequestHeaders(requestHeaders)).ok;
}
