import { NextResponse } from 'next/server';
import { getClinicInfo, updateClinicInfo, getClinics, createClinic } from '@/services/clinic.service';
import { withAuth, withAuthOnly } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

function handleClinicUpdate(request: Request, body: Record<string, unknown>) {
  return withAuth(async (_req: Request, { clinicId }) => {
    const updatedClinicInfo = await updateClinicInfo(clinicId, body);
    return NextResponse.json(updatedClinicInfo);
  }, { requiredPermission: 'clinic.update' })(request);
}

// GET /api/clinic - List all clinics for user (no clinic context)
// GET /api/clinic?id=current - Get current clinic info (cookie/header clinic)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('id');

  if (clinicId) {
    return withAuth(async (_req: Request, { clinicId: cId }) => {
      const clinicInfo = await getClinicInfo(cId);
      if (!clinicInfo) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

      return NextResponse.json(clinicInfo, {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      });
    })(request);
  }

  return withAuthOnly(async (userId, userEmail) => {
    const clinics = await getClinics(userEmail, userId);
    return NextResponse.json(clinics);
  })(request);
}

// POST /api/clinic - Create new clinic (body.name only)
// POST /api/clinic with id/clinicId - Update current clinic (backward compatible)
export async function POST(request: Request) {
  const body = await request.json();

  if (body.id || body.clinicId) {
    return handleClinicUpdate(request, body);
  }

  return withAuthOnly(async (userId, userEmail) => {
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 });
    }
    const newClinic = await createClinic(name, userEmail, userId);
    return NextResponse.json(newClinic);
  })(request);
}

export async function PUT(request: Request) {
  const body = await request.json();
  return handleClinicUpdate(request, body);
}
