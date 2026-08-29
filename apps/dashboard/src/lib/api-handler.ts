import { NextResponse } from 'next/server';
import { getAuthContext, getClinicId, verifyMembership, getMemberRole } from './auth';
import { type Permission, type Role, hasPermission } from './permissions';
import { ApiError } from './errors';

export interface AuthenticatedContext {
  userId: string;
  userEmail: string;
  clinicId: string;
  userRole: Role | null;
}

export interface AuthOptions {
  requiredPermission?: Permission;
}

type ApiHandler<T = unknown, P = unknown> = (
  request: Request,
  context: AuthenticatedContext,
  routeParams: P
) => Promise<NextResponse<T> | NextResponse>;

function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

export function withAuth<T = unknown, P = unknown>(handler: ApiHandler<T, P>, options?: AuthOptions) {
  return async (request: Request, routeParams?: P) => {
    try {
      const { userId, userEmail } = await getAuthContext();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const clinicId = await getClinicId();
      if (!clinicId) {
        return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });
      }

      if (!userEmail || !(await verifyMembership(clinicId, userEmail, userId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      let userRole: Role | null = null;
      if (options?.requiredPermission) {
        userRole = await getMemberRole(clinicId, userEmail, userId);
        if (!hasPermission(userRole, options.requiredPermission)) {
          return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
        }
      }

      const context: AuthenticatedContext = { userId, userEmail, clinicId, userRole };
      // Dynamic routes always receive routeParams from Next.js; static routes never read it.
      return await handler(request, context, routeParams as P);
    } catch (error: unknown) {
      return jsonError(error);
    }
  };
}

export function withAuthOnly<T = unknown, P = unknown>(
  handler: (userId: string, userEmail: string, request: Request, params?: P) => Promise<NextResponse<T> | NextResponse>
) {
  return async (request: Request, routeParams?: P) => {
    try {
      const { userId, userEmail } = await getAuthContext();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }

      return await handler(userId, userEmail, request, routeParams);
    } catch (error: unknown) {
      return jsonError(error);
    }
  };
}
