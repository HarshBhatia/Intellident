import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/terms',
  '/privacy',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/tooth-icon.jpg',
  '/select-clinic(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);
  const { pathname } = url;

  // 1. ABSOLUTE BYPASS for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('/static/') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  // 2. E2E test bypass — skip Clerk auth entirely
  const e2eSecret = request.cookies.get('x-e2e-secret')?.value || request.headers.get('x-e2e-secret');
  const secret = process.env.E2E_TEST_SECRET || 'e2e-secret-key';
  if (e2eSecret === secret) {
    return NextResponse.next();
  }

  // 3. Handle Public Routes - skip auth
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // 4. Authenticate regular routes
  const { userId } = await auth();
  if (!userId) {
    return (await auth()).redirectToSignIn();
  }

  // 5. Clinic Selection Logic
  const clinicId = request.cookies.get('clinic_id')?.value || request.headers.get('x-clinic-id');
  const isSelectPage = pathname.startsWith('/select-clinic');
  const isApi = pathname.startsWith('/api');

  if (!clinicId && !isSelectPage && !isApi) {
    return NextResponse.redirect(new URL('/select-clinic', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
