// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase/config'; // Assuming your Firebase admin init is here or accessible

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/api/auth']; // Add any other public paths, e.g., /api/public-data

  // If the path is public, allow access
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // For all other paths, check for Firebase authentication
  // This is a conceptual check. Actual Firebase Admin SDK usage for server-side auth check is complex in middleware.
  // A common pattern is to use a session cookie set upon login that middleware can verify.
  // For simplicity, this example assumes a client-side redirect if auth state is not quickly available.
  // A more robust solution involves HTTP-only cookies or server-side session management.

  const sessionCookie = request.cookies.get('firebaseSessionToken')?.value; // Example: if you set a session cookie

  if (!sessionCookie) { // Replace with actual token verification if using server-side sessions
    // If no session token, redirect to login
    // Preserve the original intended path for redirection after login
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') { // Avoid redirect loop if login is the root
        loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If using Firebase Admin SDK to verify the token (requires async or careful handling):
  // try {
  //   const decodedToken = await auth.verifyIdToken(sessionCookie); // This is Firebase Admin SDK, not client SDK
  //   // User is authenticated, proceed
  //   return NextResponse.next();
  // } catch (error) {
  //   // Token is invalid or expired, redirect to login
  //   console.error('Middleware Auth Error:', error);
  //   const loginUrl = new URL('/login', request.url);
  //   if (pathname !== '/') {
  //       loginUrl.searchParams.set('redirect', pathname);
  //   }
  //   const response = NextResponse.redirect(loginUrl);
  //   response.cookies.delete('firebaseSessionToken'); // Clear invalid cookie
  //   return response;
  // }


  // If sessionCookie exists but not verifying it server-side here, assume client will handle auth state.
  // This is less secure as middleware isn't strictly enforcing auth.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
