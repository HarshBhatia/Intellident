import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const sql = getDb();
    const rows = await sql`SELECT * FROM patients WHERE patient_id = ${id} AND clinic_id = ${clinicId}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const body = await request.json();
    const sql = getDb();
    
    // Explicitly update all columns
    const { name, age, amount, date, doctor, gender, mode_of_payment, paid_for, phone_number, medicine_prescribed, notes, patient_type, share, tooth_number, treatment_done, xrays, payments } = body;

    const result = await sql`
      UPDATE patients SET
        name = ${name},
        age = ${age},
        amount = ${amount},
        date = ${date},
        doctor = ${doctor},
        gender = ${gender},
        mode_of_payment = ${mode_of_payment},
        paid_for = ${paid_for},
        phone_number = ${phone_number},
        medicine_prescribed = ${medicine_prescribed},
        notes = ${notes},
        patient_type = ${patient_type},
        share = ${share},
        tooth_number = ${tooth_number},
        treatment_done = ${treatment_done},
        xrays = ${xrays},
        payments = ${payments}
      WHERE patient_id = ${id} AND clinic_id = ${clinicId}
      RETURNING *
    `;
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const sql = getDb();
    await sql`DELETE FROM patients WHERE patient_id = ${id} AND clinic_id = ${clinicId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
