import { NextResponse } from 'next/server';
import { getAuthContext, getClinicId, verifyMembership, getMemberRole } from '@/lib/auth';

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId || !userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ role: null });

    // Verify membership before exposing role
    if (!(await verifyMembership(clinicId, userEmail, userId))) {
      return NextResponse.json({ role: null });
    }

    const role = await getMemberRole(clinicId, userEmail, userId);
    return NextResponse.json({ role });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
