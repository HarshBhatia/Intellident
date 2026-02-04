import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM clinic_info WHERE id = 1`;
    return NextResponse.json(rows[0] || {});
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinic_name, owner_name, phone, address, email, google_maps_link } = body;
    const sql = getDb();
    
    // Upsert logic
    const result = await sql`
      INSERT INTO clinic_info (id, clinic_name, owner_name, phone, address, email, google_maps_link)
      VALUES (1, ${clinic_name}, ${owner_name}, ${phone}, ${address}, ${email}, ${google_maps_link})
      ON CONFLICT (id) DO UPDATE SET
        clinic_name = EXCLUDED.clinic_name,
        owner_name = EXCLUDED.owner_name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        email = EXCLUDED.email,
        google_maps_link = EXCLUDED.google_maps_link
      RETURNING *
    `;
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
