import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const rawSecret = process.env.JWT_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes (but allow the login page itself through)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookieToken = request.cookies.get('admin_session')?.value;

    // No cookie → redirect to login
    if (!cookieToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Verify the JWT signature and expiry
    try {
      if (!rawSecret) throw new Error('JWT_SECRET not configured');
      const key = new TextEncoder().encode(rawSecret);
      await jwtVerify(cookieToken, key, { algorithms: ['HS256'] });
      // Valid — let the request through
      return NextResponse.next();
    } catch {
      // Invalid or expired token → redirect to login and clear the bad cookie
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.set('admin_session', '', { maxAge: 0, path: '/' });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
