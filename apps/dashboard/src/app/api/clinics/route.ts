import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const sql = getDb();
    const clinics = await sql`
      SELECT c.id, c.name, cm.role 
      FROM clinics c
      JOIN clinic_members cm ON c.id = cm.clinic_id
      WHERE cm.user_email = ${userEmail}
      ORDER BY c.created_at DESC
    `;
    
    return NextResponse.json(clinics);
  } catch (error) {
    console.error('Fetch clinics error:', error);
    return NextResponse.json({ error: 'Failed to fetch clinics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    const body = await request.json();
    const { name } = body;

    const sql = getDb();
    
    // 1. Create Clinic
    const newClinic = await sql`
      INSERT INTO clinics (name, owner_email) 
      VALUES (${name}, ${userEmail}) 
      RETURNING id, name
    `;
    const clinicId = newClinic[0].id;

    // 2. Add Member as Owner
    await sql`
      INSERT INTO clinic_members (clinic_id, user_email, role)
      VALUES (${clinicId}, ${userEmail}, 'OWNER')
    `;

    return NextResponse.json({ id: clinicId, name: newClinic[0].name, role: 'OWNER' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create clinic' }, { status: 500 });
  }
}
