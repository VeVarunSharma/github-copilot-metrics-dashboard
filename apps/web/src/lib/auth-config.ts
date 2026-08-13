export const AUTH_MODES = ['open', 'shared-password', 'identity-header'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const DEFAULT_AUTH_COOKIE_NAME = 'ghcp_dash_session';
export const DEFAULT_IDENTITY_HEADER_NAME = 'x-ms-client-principal-name';

type AuthEnv = {
  [key: string]: string | undefined;
  AUTH_MODE?: string;
  DASHBOARD_PASSWORD?: string;
  AUTH_COOKIE_NAME?: string;
  AUTH_IDENTITY_HEADER?: string;
};

function normalize(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isAuthMode(value: string): value is AuthMode {
  return (AUTH_MODES as readonly string[]).includes(value);
}

export function hasDashboardPassword(source: AuthEnv = process.env) {
  return Boolean(normalize(source.DASHBOARD_PASSWORD));
}

export function resolveAuthMode(source: AuthEnv = process.env): AuthMode {
  const explicit = normalize(source.AUTH_MODE)?.toLowerCase();
  if (explicit) {
    if (isAuthMode(explicit)) return explicit;
    throw new Error(`Invalid AUTH_MODE "${explicit}". Expected one of: ${AUTH_MODES.join(', ')}.`);
  }
  return hasDashboardPassword(source) ? 'shared-password' : 'open';
}

export function authModeRequiresProtection(source: AuthEnv = process.env) {
  return resolveAuthMode(source) !== 'open';
}

export function sharedPasswordFallbackEnabled(source: AuthEnv = process.env) {
  const mode = resolveAuthMode(source);
  return hasDashboardPassword(source) && (mode === 'shared-password' || mode === 'identity-header');
}

export function resolveAuthCookieName(source: AuthEnv = process.env) {
  return normalize(source.AUTH_COOKIE_NAME) ?? DEFAULT_AUTH_COOKIE_NAME;
}

export function resolveIdentityHeaderName(source: AuthEnv = process.env) {
  return (normalize(source.AUTH_IDENTITY_HEADER) ?? DEFAULT_IDENTITY_HEADER_NAME).toLowerCase();
}
