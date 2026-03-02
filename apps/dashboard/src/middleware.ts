import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/api/health', '/api/debug/(.*)', '/privacy', '/terms', '/manifest.webmanifest', '/select-clinic']);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  
  // E2E Test Bypass
  const e2eSecret = request.headers.get('x-e2e-secret') || request.cookies.get('x-e2e-secret')?.value;
  const secret = process.env.E2E_TEST_SECRET || 'e2e-secret-key';
  const isE2E = e2eSecret === secret;

  if (!isPublicRoute(request) && !isE2E && !userId) {
    return (await auth()).redirectToSignIn();
  }

  // Check for clinic selection (shared logic for both real and E2E)
  const clinicId = request.cookies.get('clinic_id')?.value || request.headers.get('x-clinic-id');
  const isSelectPage = request.nextUrl.pathname === '/select-clinic';
  const isApi = request.nextUrl.pathname.startsWith('/api');
  const isPublic = isPublicRoute(request);

  // Skip redirect if we are in public routes, or already on select page, or it's an API call, or we have a clinicId
  if (!clinicId && !isSelectPage && !isApi && !isE2E && !isPublic) {
    const selectUrl = new URL('/select-clinic', request.url);
    return NextResponse.redirect(selectUrl);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
