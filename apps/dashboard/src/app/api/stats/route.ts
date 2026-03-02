import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getClinicStats } from '@/services/stats.service';
import { getAuthContext, verifyMembership } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1));
    const endDate = new Date(searchParams.get('endDate') || new Date());

    const stats = await getClinicStats(clinicId, startDate, endDate);

    return NextResponse.json(stats);
  } catch (error: any) { 
    console.error('Stats aggregation error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: error.message || error.toString() }, { status: 500 });
  }
}
