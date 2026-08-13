import { NextResponse, type NextRequest } from 'next/server';
import { resolveAuthMode, sharedPasswordFallbackEnabled } from '@/lib/auth-config';
import { authenticateRequestHeaders } from '@/lib/auth-request';

export function isPublicPath(pathname: string) {
  if (pathname === '/') return true;
  if (pathname === '/getting-started' || pathname.startsWith('/getting-started/')) return true;
  if (pathname === '/login' || pathname.startsWith('/login/')) return true;
  if (pathname === '/calculator' || pathname.startsWith('/calculator/')) return true;
  if (pathname === '/api/health') return true;
  if (pathname === '/api/auth/login' || pathname === '/api/auth/logout') return true;
  return false;
}

export async function middleware(request: NextRequest) {
  if (resolveAuthMode() === 'open') return NextResponse.next();
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

  if ((await authenticateRequestHeaders(request.headers)).ok) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!sharedPasswordFallbackEnabled()) return new NextResponse('Unauthorized', { status: 401 });

  return NextResponse.redirect(new URL('/login', request.url));
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'] };
