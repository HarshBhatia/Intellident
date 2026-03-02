import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getClinicMembers, addClinicMember, removeClinicMember } from '@/services/clinicMember.service';
import { getAuthContext, verifyMembership } from '@/lib/auth';

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

    const members = await getClinicMembers(clinicId);
    
    const currentMember = members.find(m => m.user_email === userEmail);
    const currentUserRole = currentMember?.role || 'DOCTOR';

    return NextResponse.json({ members, currentUserRole });
  } catch (error: any) {
    console.error('Fetch members error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch members' }, { status: 500 });
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
    const { email } = body;
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const newMember = await addClinicMember(clinicId, email);
    
    return NextResponse.json(newMember);
  } catch (error: any) {
    console.error('Add member error:', error);
    if (error.message === 'User email is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to invite member' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

    await removeClinicMember(clinicId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove member error:', error);
    if (error.message === 'Member not found') {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (error.message === 'Member ID is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}
