import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM expense_categories ORDER BY name ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const sql = getDb();
    const result = await sql`INSERT INTO expense_categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING RETURNING *`;
    if (result.length === 0) {
        const existing = await sql`SELECT * FROM expense_categories WHERE name = ${name}`;
        return NextResponse.json(existing[0]);
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        const sql = getDb();
        await sql`DELETE FROM expense_categories WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
