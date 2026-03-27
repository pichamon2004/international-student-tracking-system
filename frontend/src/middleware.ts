import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/dev', '/_next', '/api', '/logo.png', '/favicon.ico', '/kkulogo.png'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

// Role → allowed route prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  STAFF:   ['/staff'],
  ADMIN:   ['/staff'],
  ADVISOR: ['/advisor'],
  STUDENT: ['/student'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('ist_token')?.value;
  const role  = request.cookies.get('ist_role')?.value;

  // Allow public paths through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Already logged in and visiting /login → redirect to home
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role check: if role cookie exists, enforce route access
  if (role) {
    const allowed = ROLE_ROUTES[role] ?? [];
    const isRoleProtected = Object.values(ROLE_ROUTES).flat().some(prefix => pathname.startsWith(prefix));
    if (isRoleProtected && !allowed.some(prefix => pathname.startsWith(prefix))) {
      // Redirect to the user's own dashboard
      const home = allowed[0] ? `${allowed[0]}/dashboard` : '/login';
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
