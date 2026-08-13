import {
  resolveAuthCookieName,
  resolveAuthMode,
  resolveIdentityHeaderName,
  sharedPasswordFallbackEnabled,
  type AuthMode,
} from './auth-config';
import { verifySessionCookieValue } from './auth-session';

type HeaderReader = Pick<Headers, 'get'>;
type AuthSource = Parameters<typeof resolveAuthMode>[0];

export type RequestAuthResult =
  | { ok: true; mode: AuthMode; subject?: string }
  | { ok: false; mode: AuthMode };

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return rawValue.join('=');
  }

  return undefined;
}

export function readTrustedIdentity(headers: HeaderReader, source: AuthSource = process.env) {
  if (resolveAuthMode(source) !== 'identity-header') return undefined;

  const value = headers.get(resolveIdentityHeaderName(source))?.trim();
  return value || undefined;
}

export async function authenticateRequestHeaders(headers: HeaderReader, source: AuthSource = process.env): Promise<RequestAuthResult> {
  const mode = resolveAuthMode(source);

  if (mode === 'open') return { ok: true, mode };

  const identity = readTrustedIdentity(headers, source);
  if (identity) return { ok: true, mode: 'identity-header', subject: identity };

  if (sharedPasswordFallbackEnabled(source)) {
    const cookieValue = readCookie(headers.get('cookie'), resolveAuthCookieName(source));
    if (await verifySessionCookieValue(cookieValue, source.DASHBOARD_PASSWORD)) {
      return { ok: true, mode: 'shared-password' };
    }
  }

  return { ok: false, mode };
}
