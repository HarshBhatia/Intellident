import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. Define Public Routes
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/api/health', 
  '/api/debug/(.*)', 
  '/api/revalidate',
  '/privacy(.*)', 
  '/terms(.*)', 
  '/manifest.webmanifest', 
  '/favicon.ico',
  '/tooth-icon.jpg',
  '/select-clinic(.*)', 
  '/api/init'
]);

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);
  const { pathname } = url;

  // 2. ABSOLUTE BYPASS for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') || 
    pathname.includes('/static/') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|webmanifest)$/)
  ) {
    // If it's a code chunk or asset that actually 404s, 
    // returning NextResponse.next() would usually let Next.js handle it.
    // However, if we want to BE SURE we don't redirect to login, we stay here.
    return NextResponse.next();
  }

  // 3. E2E Bypass
  const e2eSecret = request.headers.get('x-e2e-secret') || request.cookies.get('x-e2e-secret')?.value;
  if (e2eSecret === 'e2e-secret-key') {
    return NextResponse.next();
  }

  // 4. Handle Public Routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // 5. Authenticate regular routes
  const { userId } = await auth();
  if (!userId) {
    return (await auth()).redirectToSignIn();
  }

  // 6. Clinic Selection Logic
  const clinicId = request.cookies.get('clinic_id')?.value || request.headers.get('x-clinic-id');
  const isSelectPage = pathname.startsWith('/select-clinic');
  const isApi = pathname.startsWith('/api');

  if (!clinicId && !isSelectPage && !isApi) {
    return NextResponse.redirect(new URL('/select-clinic', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
