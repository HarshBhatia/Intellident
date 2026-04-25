import { NextResponse } from 'next/server';
import { getClinicInfo, updateClinicInfo, getClinics, createClinic } from '@/services/clinic.service';
import { withAuth, withAuthOnly } from '@/lib/api-handler';

export const revalidate = 60;

// GET /api/clinic - List all clinics for user (no clinic context)
// GET /api/clinic?id=123 - Get specific clinic info (with clinic context)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('id');

  if (clinicId) {
    // Get specific clinic info (requires auth + clinic membership)
    return withAuth(async (req: Request, { clinicId: cId }) => {
      const clinicInfo = await getClinicInfo(cId);
      if (!clinicInfo) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
      
      return NextResponse.json(clinicInfo, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    })(request);
  }

  // List all clinics for user (no clinic context required)
  return withAuthOnly(async (_userId, userEmail) => {
    const clinics = await getClinics(userEmail);
    return NextResponse.json(clinics);
  })(request);
}

// POST /api/clinic - Create new clinic (no clinic context)
// PUT /api/clinic - Update current clinic (with clinic context)
export async function POST(request: Request) {
  const body = await request.json();
  
  if (body.id || body.clinicId) {
    // Update existing clinic
    return withAuth(async (req: Request, { clinicId }) => {
      const updatedClinicInfo = await updateClinicInfo(clinicId, body);
      return NextResponse.json(updatedClinicInfo);
    })(request);
  }

  // Create new clinic
  return withAuthOnly(async (_userId, userEmail, req) => {
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 });
    }
    const newClinic = await createClinic(name, userEmail);
    return NextResponse.json(newClinic);
  })(request);
}
