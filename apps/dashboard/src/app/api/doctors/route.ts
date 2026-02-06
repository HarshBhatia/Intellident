import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const sql = getDb();
    const rows = await sql`SELECT * FROM doctors WHERE user_email = ${userEmail}`;
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
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const sql = getDb();
    const result = await sql`
      INSERT INTO doctors (name, user_email)
      VALUES (${name}, ${userEmail})
      ON CONFLICT (name, user_email) DO NOTHING
      RETURNING *
    `;
    
    if (result.length === 0) {
        const existing = await sql`SELECT * FROM doctors WHERE name = ${name} AND user_email = ${userEmail}`;
        return NextResponse.json(existing[0]);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Add doctor error:', error);
    return NextResponse.json({ error: 'Failed to add doctor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const { id } = await request.json();
    const sql = getDb();
    await sql`DELETE FROM doctors WHERE id = ${id} AND user_email = ${userEmail}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return NextResponse.json({ error: 'Failed to delete doctor' }, { status: 500 });
  }
}
