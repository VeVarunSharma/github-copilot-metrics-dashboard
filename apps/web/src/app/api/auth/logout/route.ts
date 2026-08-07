import { NextResponse } from 'next/server';
import { cookieName, expiredSessionCookieOptions } from '@/lib/auth';
import { resolveAuthMode } from '@/lib/auth-config';

export async function POST(request: Request) {
  const redirectUrl =
    resolveAuthMode() === 'identity-header'
      ? new URL('/.auth/logout?post_logout_redirect_uri=/login%3FloggedOut%3D1', request.url)
      : new URL('/login?loggedOut=1', request.url);

  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set(cookieName, '', expiredSessionCookieOptions);
  return response;
}
