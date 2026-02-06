import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { verifyMembership } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const sql = getDb();
    const members = await sql`SELECT id, user_email, role, status FROM clinic_members WHERE clinic_id = ${clinicId}`;
    
    const currentMember = members.find(m => m.user_email === userEmail);
    const currentUserRole = currentMember?.role || 'DOCTOR';

    return NextResponse.json({ members, currentUserRole });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
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
    const { email } = body;

    const sql = getDb();
    // Default role is DOCTOR for now
    const result = await sql`
      INSERT INTO clinic_members (clinic_id, user_email, role, status)
      VALUES (${clinicId}, ${email}, 'DOCTOR', 'ACTIVE')
      ON CONFLICT (clinic_id, user_email) DO NOTHING
      RETURNING *
    `;
    
    return NextResponse.json(result[0] || { message: 'Already a member' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const sql = getDb();
    // Prevent removing yourself if you are the only owner? Logic can be added later.
    await sql`DELETE FROM clinic_members WHERE id = ${id} AND clinic_id = ${clinicId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
