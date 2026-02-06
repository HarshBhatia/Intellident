import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const sql = getDb();
    // Fetch clinic info from clinics table (or clinic_info if we decide to keep it separate, 
    // but in new schema clinics table has the basic info. If we kept clinic_info for extended details, we should join or fetch from there.
    // Based on migration, we have a clinics table with name, address, phone. 
    // Let's assume we want to return the extended info.
    // Wait, the migration created 'clinics' table with: name, owner_email, address, phone, google_maps_link.
    // So 'clinics' table IS the new source of truth.
    
    const rows = await sql`SELECT * FROM clinics WHERE id = ${clinicId}`;
    if (rows.length === 0) return NextResponse.json({});
    
    // Map to old format expected by frontend
    const c = rows[0];
    return NextResponse.json({
        clinic_name: c.name,
        owner_name: '', // We might need to fetch owner name separately or remove this requirement
        phone: c.phone,
        address: c.address,
        email: c.owner_email,
        google_maps_link: c.google_maps_link
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
    const { clinic_name, phone, address, google_maps_link } = body;
    const sql = getDb();
    
    const result = await sql`
      UPDATE clinics SET
        name = ${clinic_name},
        phone = ${phone},
        address = ${address},
        google_maps_link = ${google_maps_link}
      WHERE id = ${clinicId}
      RETURNING *
    `;
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
