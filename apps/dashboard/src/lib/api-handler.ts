import { NextResponse } from 'next/server';
import { getAuthContext, getClinicId, verifyMembership } from './auth';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedContext {
  userId: string;
  userEmail: string;
  clinicId: string;
}

type ApiHandler<T = any> = (
  context: AuthenticatedContext,
  request: Request,
  params?: any
) => Promise<NextResponse<T>>;

// ============================================================================
// API Handler Wrapper
// ============================================================================

/**
 * Wraps an API route handler with authentication and authorization checks.
 * Automatically handles:
 * - User authentication (Clerk)
 * - Clinic context validation
 * - Clinic membership verification
 * - Error handling
 * 
 * @param handler - The actual API route logic
 * @returns A wrapped handler with auth checks
 * 
 * @example
 * export const GET = withAuth(async (context, request) => {
 *   const { clinicId } = context;
 *   const data = await getData(clinicId);
 *   return NextResponse.json(data);
 * });
 */
export function withAuth<T = any>(handler: ApiHandler<T>) {
  return async (request: Request, routeParams?: any) => {
    try {
      // 1. Authenticate user
      const { userId, userEmail } = await getAuthContext();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Get clinic context
      const clinicId = await getClinicId();
      if (!clinicId) {
        return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });
      }

      // 3. Verify clinic membership
      if (!userEmail || !(await verifyMembership(clinicId, userEmail, userId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // 4. Call the actual handler with authenticated context
      const context: AuthenticatedContext = { userId, userEmail, clinicId };
      return await handler(context, request, routeParams);
    } catch (error: any) {
      console.error('API Handler Error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Wraps an API route handler with only authentication (no clinic context required).
 * Useful for routes like /api/clinics that don't require a clinic to be selected.
 * 
 * @param handler - The actual API route logic
 * @returns A wrapped handler with auth checks
 * 
 * @example
 * export const GET = withAuthOnly(async (userId, userEmail, request) => {
 *   const clinics = await getClinics(userEmail);
 *   return NextResponse.json(clinics);
 * });
 */
export function withAuthOnly<T = any>(
  handler: (userId: string, userEmail: string, request: Request, params?: any) => Promise<NextResponse<T>>
) {
  return async (request: Request, routeParams?: any) => {
    try {
      // Authenticate user
      const { userId, userEmail } = await getAuthContext();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }

      // Call the actual handler
      return await handler(userId, userEmail, request, routeParams);
    } catch (error: any) {
      console.error('API Handler Error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
