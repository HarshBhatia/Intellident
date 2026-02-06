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
    const rows = await sql`SELECT * FROM expenses WHERE user_email = ${userEmail} ORDER BY date DESC`;
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
    const sql = getDb();
    const { date, amount, category, description } = body;
    const result = await sql`
      INSERT INTO expenses (date, amount, category, description, user_email)
      VALUES (${date}, ${amount}, ${category}, ${description}, ${userEmail})
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        const sql = getDb();
        await sql`DELETE FROM expenses WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
