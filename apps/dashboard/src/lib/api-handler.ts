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

type ApiHandler<T = any> = (
  request: Request,
  context: AuthenticatedContext,
  routeParams?: any
) => Promise<NextResponse<T> | NextResponse>;

function jsonError(error: any) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { error: error.message || 'Internal server error' },
    { status: 500 }
  );
}

export function withAuth<T = any>(handler: ApiHandler<T>, options?: AuthOptions) {
  return async (request: Request, routeParams?: any) => {
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
      return await handler(request, context, routeParams);
    } catch (error: any) {
      return jsonError(error);
    }
  };
}

export function withAuthOnly<T = any>(
  handler: (userId: string, userEmail: string, request: Request, params?: any) => Promise<NextResponse<T> | NextResponse>
) {
  return async (request: Request, routeParams?: any) => {
    try {
      const { userId, userEmail } = await getAuthContext();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }

      return await handler(userId, userEmail, request, routeParams);
    } catch (error: any) {
      return jsonError(error);
    }
  };
}
