import { env } from './env';

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const SESSION_VERSION = 'v1';
const DISABLED_AUTH_SESSION_VALUE = 'authenticated';
const CLOCK_SKEW_SECONDS = 60;
const encoder = new TextEncoder();

export const cookieName = env.AUTH_COOKIE_NAME;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

export const expiredSessionCookieOptions = {
  ...sessionCookieOptions,
  maxAge: 0,
  expires: new Date(0),
} as const;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string) {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}

async function sha256Hex(value: string) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function hmacHex(payload: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export async function verifyPassword(candidate: string, secret = env.DASHBOARD_PASSWORD) {
  if (!secret) return true;
  const [candidateHash, secretHash] = await Promise.all([sha256Hex(candidate), sha256Hex(secret)]);
  return constantTimeEqual(candidateHash, secretHash);
}

export async function createSessionCookieValue(secret = env.DASHBOARD_PASSWORD, nowMs = Date.now()) {
  if (!secret) return DISABLED_AUTH_SESSION_VALUE;
  const issuedAtSeconds = Math.floor(nowMs / 1000);
  const payload = `${SESSION_VERSION}.${issuedAtSeconds}`;
  return `${payload}.${await hmacHex(payload, secret)}`;
}

export async function verifySessionCookieValue(value: string | undefined, secret = env.DASHBOARD_PASSWORD, nowMs = Date.now()) {
  if (!secret) return true;
  if (!value) return false;

  const parts = value.split('.');
  if (parts.length !== 3) return false;

  const [version, issuedAtPart, signature] = parts;
  if (version !== SESSION_VERSION || !issuedAtPart || !signature) return false;

  const issuedAtSeconds = Number(issuedAtPart);
  if (!Number.isSafeInteger(issuedAtSeconds) || issuedAtSeconds <= 0) return false;

  const nowSeconds = Math.floor(nowMs / 1000);
  if (issuedAtSeconds > nowSeconds + CLOCK_SKEW_SECONDS) return false;
  if (nowSeconds - issuedAtSeconds > SESSION_MAX_AGE_SECONDS) return false;

  const payload = `${version}.${issuedAtPart}`;
  return constantTimeEqual(signature, await hmacHex(payload, secret));
}
