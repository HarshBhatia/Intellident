import { NextResponse } from 'next/server';
import { getClinicId, getAuthContext, verifyMembership } from '@/lib/auth';
import { getPatientByIdWithVisits, updatePatient, deletePatient } from '@/services/patient.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patient = await getPatientByIdWithVisits(clinicId, id);
    if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    return NextResponse.json(patient);
  } catch (error: any) {
    console.error('Error in GET /api/patients/[id]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch patient' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updatedPatient = await updatePatient(clinicId, id, body);
    
    return NextResponse.json(updatedPatient);
  } catch (error: any) {
    console.error('Error in PUT /api/patients/[id]:', error);
    if (error.message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update patient' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deletePatient(clinicId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/patients/[id]:', error);
    if (error.message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete patient' }, { status: 500 });
  }
}
