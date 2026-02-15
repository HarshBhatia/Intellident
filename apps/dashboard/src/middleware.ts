import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/health']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();

    // Check for clinic selection
    const clinicId = request.cookies.get('clinic_id')?.value;
    const isSelectPage = request.nextUrl.pathname === '/select-clinic';
    const isApi = request.nextUrl.pathname.startsWith('/api');

    if (!clinicId && !isSelectPage && !isApi) {
      const selectUrl = new URL('/select-clinic', request.url);
      return Response.redirect(selectUrl);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ],
};
