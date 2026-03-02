import { NextResponse } from 'next/server';
import { getClinicId, getAuthContext, verifyMembership } from '@/lib/auth';
import { getVisits, createVisit, deleteVisit, updateVisit } from '@/services/visit.service'; // Import the new service

export async function GET(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    const visits = await getVisits(clinicId, patientId || undefined);
    return NextResponse.json(visits);
  } catch (error: any) {
    console.error('Fetch visits error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch visits' }, { status: 500 });
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
    const newVisit = await createVisit(clinicId, body);

    return NextResponse.json(newVisit);
  } catch (error: any) {
    console.error('Create visit error:', error);
    if (error.message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    if (error.message === 'Patient ID is required' || error.message === 'Visit date is required' || error.message === 'Clinic ID is required' || error.message === 'Visit date cannot be in the future') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create visit' }, { status: 500 });
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Visit ID is required' }, { status: 400 });

    await deleteVisit(clinicId, id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete visit error:', error);
    if (error.message === 'Visit not found') {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }
    if (error.message === 'Visit ID is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete visit' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updatedVisit = await updateVisit(clinicId, body);

    return NextResponse.json(updatedVisit);
  } catch (error: any) {
    console.error('Update visit error:', error);
    if (error.message === 'Visit not found') {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }
    if (error.message === 'Visit ID is required' || error.message === 'Clinic ID is required' || error.message === 'Visit date cannot be in the future') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update visit' }, { status: 500 });
  }
}