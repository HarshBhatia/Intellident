import { NextResponse } from 'next/server';
import { getClinicId, getAuthContext, verifyMembership } from '@/lib/auth';
import { getDoctors, createDoctor, deleteDoctor } from '@/services/doctor.service';

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const doctors = await getDoctors(clinicId);
    return NextResponse.json(doctors);
  } catch (error: any) {
    console.error('Fetch doctors error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch doctors' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Doctor name is required' }, { status: 400 });

    const newDoctor = await createDoctor(name, clinicId);
    
    return NextResponse.json(newDoctor);
  } catch (error: any) {
    console.error('Add doctor error:', error);
    if (error.message === 'Doctor name is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to add doctor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });

    await deleteDoctor(id, clinicId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete doctor error:', error);
    if (error.message === 'Doctor not found') {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    if (error.message === 'Doctor ID is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete doctor' }, { status: 500 });
  }
}
