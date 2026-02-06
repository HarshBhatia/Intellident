import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const sql = getDb();
    const rows = await sql`SELECT * FROM treatments WHERE clinic_id = ${clinicId}`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const body = await request.json();
    const { name } = body;
    const sql = getDb();
    const result = await sql`
      INSERT INTO treatments (name, clinic_id)
      VALUES (${name}, ${clinicId})
      ON CONFLICT (name, clinic_id) DO NOTHING
      RETURNING *
    `;
    return NextResponse.json(result[0] || { name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const body = await request.json();
    const { id } = body;
    const sql = getDb();
    await sql`DELETE FROM treatments WHERE id = ${id} AND clinic_id = ${clinicId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
