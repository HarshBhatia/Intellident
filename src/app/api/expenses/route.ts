import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const sql = getDb();
    let rows;
    
    if (start && end) {
        rows = await sql`SELECT * FROM expenses WHERE date >= ${start} AND date <= ${end} ORDER BY date DESC`;
    } else {
        rows = await sql`SELECT * FROM expenses ORDER BY date DESC LIMIT 100`;
    }
    
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { date, amount, category, description } = await request.json();
    const sql = getDb();
    const result = await sql`
      INSERT INTO expenses (date, amount, category, description) 
      VALUES (${date}, ${amount}, ${category}, ${description}) 
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
