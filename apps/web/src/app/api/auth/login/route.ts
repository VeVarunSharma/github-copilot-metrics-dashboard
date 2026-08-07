import { NextResponse } from 'next/server';
import { cookieName, createSessionCookieValue, sessionCookieOptions, verifyPassword } from '@/lib/auth';
import { sharedPasswordFallbackEnabled } from '@/lib/auth-config';

export async function POST(request: Request) {
  if (!sharedPasswordFallbackEnabled()) {
    return NextResponse.redirect(new URL('/login?error=disabled', request.url), { status: 303 });
  }

  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  if (!(await verifyPassword(password, process.env.DASHBOARD_PASSWORD))) return NextResponse.redirect(new URL('/login?error=1', request.url), { status: 303 });
  const response = NextResponse.redirect(new URL('/overview', request.url), { status: 303 });
  response.cookies.set(cookieName, await createSessionCookieValue(process.env.DASHBOARD_PASSWORD), sessionCookieOptions);
  return response;
}
