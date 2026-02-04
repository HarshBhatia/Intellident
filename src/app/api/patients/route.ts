import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Patient } from '@/types';

export async function GET() {
  try {
    const sql = getDb();
    // Ensure table exists implicitly or catch error if not
    const rows = await sql`SELECT * FROM patients ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Patient = await request.json();
    const sql = getDb();
    
    await sql`
      INSERT INTO patients (
        patient_id, name, age, amount, date, doctor, gender, mode_of_payment, 
        paid_for, phone_number, medicine_prescribed, notes, patient_type, 
        share, tooth_number, treatment_done
      ) VALUES (
        ${body.patient_id}, ${body.name}, ${body.age}, ${body.amount}, ${body.date}, 
        ${body.doctor}, ${body.gender}, ${body.mode_of_payment}, ${body.paid_for}, 
        ${body.phone_number}, ${body.medicine_prescribed}, ${body.notes}, 
        ${body.patient_type}, ${body.share}, ${body.tooth_number}, ${body.treatment_done}
      )
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: 'Failed to add patient' }, { status: 500 });
  }
}
