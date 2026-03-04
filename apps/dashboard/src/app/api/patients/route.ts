import { NextResponse } from 'next/server';
import { verifyMembership, getClinicId, getAuthContext } from '@/lib/auth';
import { getPatients, createPatient } from '@/services/patient.service'; // Import the new service

// Cache for 30 seconds, stale-while-revalidate for 60 seconds
export const revalidate = 30;

export async function GET() {
  try {
    const startTime = Date.now();
    
    const { userId, userEmail } = await getAuthContext();
    const authTime = Date.now() - startTime;
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();

    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });
    
    const membershipStart = Date.now();
    if (!userEmail || !(await verifyMembership(clinicId, userEmail, userId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const membershipTime = Date.now() - membershipStart;

    const queryStart = Date.now();
    const patients = await getPatients(clinicId);
    const queryTime = Date.now() - queryStart;
    
    const totalTime = Date.now() - startTime;
    
    // Log performance metrics in production
    console.log(`[/api/patients] Total: ${totalTime}ms | Auth: ${authTime}ms | Membership: ${membershipTime}ms | Query: ${queryTime}ms | Patients: ${patients.length}`);
    
    return NextResponse.json(patients, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
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

    if (!userEmail || !(await verifyMembership(clinicId, userEmail, userId))) {
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
