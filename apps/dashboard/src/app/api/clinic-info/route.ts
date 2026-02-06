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
    const rows = await sql`SELECT * FROM clinic_info WHERE user_email = ${userEmail}`;
    return NextResponse.json(rows[0] || {});
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
    const { clinic_name, owner_name, phone, address, email, google_maps_link } = body;
    const sql = getDb();
    
    // Upsert logic based on user_email instead of fixed ID 1
    const result = await sql`
      INSERT INTO clinic_info (clinic_name, owner_name, phone, address, email, google_maps_link, user_email)
      VALUES (${clinic_name}, ${owner_name}, ${phone}, ${address}, ${email}, ${google_maps_link}, ${userEmail})
      ON CONFLICT (user_email) DO UPDATE SET
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
