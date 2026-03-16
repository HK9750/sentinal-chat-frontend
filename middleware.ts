import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const PUBLIC_ROUTES = ['/', '/login', '/register'];
const AUTH_ROUTES = ['/login', '/register'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith('/auth/callback')) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/api')) return true;
  return false;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/chat') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/broadcasts') ||
    pathname.startsWith('/calls')
  );
}

function isStaticAssets(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/public')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAssets(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasSession = Boolean(accessToken || refreshToken);
  const isPublic = isPublicRoute(pathname);
  const isProtected = isProtectedRoute(pathname);

  if (hasSession && (pathname === '/' || isAuthRoute(pathname))) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const target = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/chat';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!hasSession && isProtected) {
    const loginUrl = new URL('/login', request.url);
    const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set('redirect', redirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic || isProtected) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
