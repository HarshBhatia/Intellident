import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM treatments ORDER BY name ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fetch treatments error:', error);
    return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const sql = getDb();
    const result = await sql`
      INSERT INTO treatments (name) VALUES (${name})
      ON CONFLICT (name) DO NOTHING
      RETURNING *
    `;
    
    // If inserted return new row, if existed return the existing one (need separate query or just return success)
    if (result.length === 0) {
        // Fetch the existing one
        const existing = await sql`SELECT * FROM treatments WHERE name = ${name}`;
        return NextResponse.json(existing[0]);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Add treatment error:', error);
    return NextResponse.json({ error: 'Failed to add treatment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        const sql = getDb();
        await sql`DELETE FROM treatments WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete treatment error:', error);
        return NextResponse.json({ error: 'Failed to delete treatment' }, { status: 500 });
    }
}
