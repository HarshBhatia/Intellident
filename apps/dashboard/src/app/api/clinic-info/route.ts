import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getClinicInfo, updateClinicInfo } from '@/services/clinicInfo.service';
import { getAuthContext, verifyMembership } from '@/lib/auth';

// Cache clinic info for 60 seconds (rarely changes)
export const revalidate = 60;

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clinicInfo = await getClinicInfo(clinicId);
    if (!clinicInfo) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    
    return NextResponse.json(clinicInfo, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Fetch clinic info error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch clinic info' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updatedClinicInfo = await updateClinicInfo(clinicId, body);
    
    return NextResponse.json(updatedClinicInfo);
  } catch (error: any) {
    console.error('Update clinic info error:', error);
    if (error.message === 'Clinic not found') {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }
    if (error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update clinic info' }, { status: 500 });
  }
}
