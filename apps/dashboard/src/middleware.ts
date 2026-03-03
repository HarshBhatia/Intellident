import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/api/health', 
  '/api/debug/(.*)', 
  '/privacy(.*)', 
  '/terms(.*)', 
  '/manifest.webmanifest', 
  '/favicon.ico',
  '/tooth-icon.jpg',
  '/select-clinic(.*)', 
  '/api/init'
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const url = new URL(request.url);
  
  // E2E Test Bypass
  const e2eSecret = request.headers.get('x-e2e-secret') || request.cookies.get('x-e2e-secret')?.value;
  const secret = process.env.E2E_TEST_SECRET || 'e2e-secret-key';
  const isE2E = e2eSecret === secret;

  if (isPublicRoute(request) || isE2E) {
    return NextResponse.next();
  }

  if (!userId) {
    return (await auth()).redirectToSignIn();
  }

  // Check for clinic selection
  const clinicId = request.cookies.get('clinic_id')?.value || request.headers.get('x-clinic-id');
  const isSelectPage = url.pathname.startsWith('/select-clinic');
  const isApi = url.pathname.startsWith('/api');

  if (!clinicId && !isSelectPage && !isApi) {
    return NextResponse.redirect(new URL('/select-clinic', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
