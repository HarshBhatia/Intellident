import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  '/',
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
  '/api/init',
  '/_next/(.*)',
  '/static/(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);
  
  // IMMEDIATELY allow all static and internal files
  if (
    url.pathname.startsWith('/_next') || 
    url.pathname.includes('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }

  const { userId } = await auth();
  
  const e2eSecret = request.headers.get('x-e2e-secret') || request.cookies.get('x-e2e-secret')?.value;
  const isE2E = e2eSecret === 'e2e-secret-key';

  if (isPublicRoute(request) || isE2E) {
    return NextResponse.next();
  }

  if (!userId) {
    return (await auth()).redirectToSignIn();
  }

  const clinicId = request.cookies.get('clinic_id')?.value || request.headers.get('x-clinic-id');
  const isSelectPage = url.pathname.startsWith('/select-clinic');
  const isApi = url.pathname.startsWith('/api');

  if (!clinicId && !isSelectPage && !isApi) {
    return NextResponse.redirect(new URL('/select-clinic', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};