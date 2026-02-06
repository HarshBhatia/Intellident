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
    const rows = await sql`SELECT * FROM treatments WHERE user_email = ${userEmail}`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
    const result = await sql`
      INSERT INTO treatments (name, user_email)
      VALUES (${name}, ${userEmail})
      ON CONFLICT (name, user_email) DO NOTHING
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
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const body = await request.json();
    const { id } = body;
    const sql = getDb();
    await sql`DELETE FROM treatments WHERE id = ${id} AND user_email = ${userEmail}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
