import { NextResponse } from 'next/server';
import { getClinicId, getAuthContext, verifyMembership } from '@/lib/auth';
import { getTreatments, createTreatment, deleteTreatment } from '@/services/treatment.service';

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const treatments = await getTreatments(clinicId);
    return NextResponse.json(treatments);
  } catch (error: any) {
    console.error('Fetch treatments error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch treatments' }, { status: 500 });
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
    const { name } = body;
    if (!name) return NextResponse.json({ error: 'Treatment name is required' }, { status: 400 });

    const newTreatment = await createTreatment(name, clinicId);
    return NextResponse.json(newTreatment);
  } catch (error: any) {
    console.error('Create treatment error:', error);
    if (error.message === 'Treatment name is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create treatment' }, { status: 500 });
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

    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Treatment ID is required' }, { status: 400 });

    await deleteTreatment(id, clinicId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete treatment error:', error);
    if (error.message === 'Treatment not found') {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    }
    if (error.message === 'Treatment ID is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete treatment' }, { status: 500 });
  }
}
