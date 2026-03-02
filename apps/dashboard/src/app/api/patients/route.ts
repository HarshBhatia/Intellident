import { NextResponse } from 'next/server';
import { verifyMembership, getClinicId, getAuthContext } from '@/lib/auth';
import { getPatients, createPatient } from '@/services/patient.service'; // Import the new service

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();

    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });
    
    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patients = await getPatients(clinicId);
    return NextResponse.json(patients);
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch patients' }, { status: 500 });
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

    const body = await request.json();
    const newPatient = await createPatient(clinicId, body);
    
    return NextResponse.json(newPatient);
  } catch (error: any) {
    console.error('Insert error:', error);
    if (error.message === 'Patient name is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create patient' }, { status: 500 });
  }
}
