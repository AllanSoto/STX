// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Firebase auth is removed, so no need to import auth from firebase config

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Since authentication is removed, most paths are public.
  // If there were specific admin paths or similar, they would need different handling.
  // For now, we'll assume all paths are accessible.

  // Example: If you had paths that previously required auth, they are now open.
  // If you want to redirect from old login/signup paths:
  if (pathname === '/login' || pathname === '/signup') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * This ensures middleware runs on actual pages.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
