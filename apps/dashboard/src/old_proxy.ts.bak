import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedPath = 
    pathname === '/' || 
    pathname.startsWith('/patients') || 
    pathname.startsWith('/api/patients');

  if (isProtectedPath) {
    if (!token || token !== 'logged_in') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }

      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/patients/:path*',
    '/api/patients/:path*'
  ],
};
