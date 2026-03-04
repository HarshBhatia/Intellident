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

    const db = await getDb();

    // Batch all queries using Promise.all for parallel execution
    const [clinicResult, patientsResult, doctorsResult] = await Promise.all([
      db.query(
        `SELECT name as clinic_name, owner_name, phone, address, email, google_maps_link 
         FROM clinics WHERE id = $1`,
        [clinicId]
      ),
      db.query(
        `SELECT p.*, 
          (SELECT MAX(date) FROM visits WHERE patient_id = p.id AND clinic_id = $1) as last_visit
         FROM patients p 
         WHERE p.clinic_id = $1 
         ORDER BY p.id DESC`,
        [clinicId]
      ),
      db.query(
        `SELECT id, name, clinic_id, user_email 
         FROM doctors 
         WHERE clinic_id = $1`,
        [clinicId]
      ),
    ]);

    return NextResponse.json({
      clinic: clinicResult.rows[0] || null,
      patients: patientsResult.rows || [],
      doctors: doctorsResult.rows || [],
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
