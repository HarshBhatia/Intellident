import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth } from '@clerk/nextjs/server';
import { getClinicId } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const sql = getDb();
    const rows = await sql`SELECT * FROM doctors WHERE clinic_id = ${clinicId}`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fetch doctors error:', error);
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const sql = getDb();
    
    const result = await sql`
      INSERT INTO doctors (name, clinic_id)
      VALUES (${name}, ${clinicId})
      ON CONFLICT (name, clinic_id) DO NOTHING
      RETURNING *
    `;
    
    if (result.length === 0) {
        const existing = await sql`SELECT * FROM doctors WHERE name = ${name} AND clinic_id = ${clinicId}`;
        return NextResponse.json(existing[0]);
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Add doctor error:', error);
    return NextResponse.json({ error: 'Failed to add doctor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const { id } = await request.json();
    const sql = getDb();
    await sql`DELETE FROM doctors WHERE id = ${id} AND clinic_id = ${clinicId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return NextResponse.json({ error: 'Failed to delete doctor' }, { status: 500 });
  }
}
