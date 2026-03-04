import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@intellident/api';
import { getAuthContext, verifyMembership } from '@/lib/auth';

// Cache for 30 seconds
export const revalidate = 30;

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;

    if (!clinicId) {
      return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });
    }

    // Verify membership
    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sql = await getDb();
    const cId = parseInt(clinicId);

    // Batch all queries using Promise.all for parallel execution
    const [clinicResult, patientsResult, doctorsResult] = await Promise.all([
      sql`SELECT name as clinic_name, owner_name, phone, address, email, google_maps_link 
          FROM clinics WHERE id = ${cId}`,
      sql`SELECT 
            p.id, 
            p.patient_id, 
            p.name, 
            p.age, 
            p.gender, 
            p.phone_number, 
            p.patient_type, 
            p.created_at, 
            p.clinic_id,
            MAX(v.date) as last_visit
          FROM patients p
          LEFT JOIN visits v ON v.patient_id = p.id AND v.clinic_id = ${cId}
          WHERE p.clinic_id = ${cId} AND p.is_active = TRUE
          GROUP BY p.id, p.patient_id, p.name, p.age, p.gender, p.phone_number, p.patient_type, p.created_at, p.clinic_id
          ORDER BY p.created_at DESC`,
      sql`SELECT id, name, clinic_id, user_email 
          FROM doctors 
          WHERE clinic_id = ${cId}`,
    ]);

    return NextResponse.json({
      clinic: clinicResult[0] || null,
      patients: patientsResult || [],
      doctors: doctorsResult || [],
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}
