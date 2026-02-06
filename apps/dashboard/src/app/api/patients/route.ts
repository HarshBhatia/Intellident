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
    const rows = await sql`SELECT * FROM patients WHERE user_email = ${userEmail} ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
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
    
    // Auto-generate next Patient ID in PID-XX format
    let nextId = 'PID-1';
    try {
      // Find the highest number in existing PID-XX IDs
      // We extract the number part from the string 'PID-123' -> 123
      const allIds = await sql`
        SELECT patient_id FROM patients 
        WHERE user_email = ${userEmail} 
        AND patient_id LIKE 'PID-%'
      `;
      
      let maxNum = 0;
      allIds.forEach(row => {
        const match = row.patient_id.match(/^PID-(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      });
      
      nextId = `PID-${maxNum + 1}`;
    } catch (e) {
      console.log('ID Generation fallback due to:', e);
      // Fallback
      const countResult = await sql`SELECT COUNT(*) FROM patients WHERE user_email = ${userEmail}`;
      nextId = `PID-${parseInt(countResult[0].count) + 1}`;
    }

    const { name, age, amount, date, doctor, gender, mode_of_payment, paid_for, phone_number, medicine_prescribed, notes, patient_type, share, tooth_number, treatment_done, xrays, payments } = body;

    const result = await sql`
      INSERT INTO patients (
        patient_id, name, age, amount, date, doctor, gender, 
        mode_of_payment, paid_for, phone_number, medicine_prescribed, 
        notes, patient_type, share, tooth_number, treatment_done, xrays, payments, user_email
      ) VALUES (
        ${nextId}, ${name}, ${age}, ${amount}, ${date}, ${doctor}, ${gender}, 
        ${mode_of_payment}, ${paid_for}, ${phone_number}, ${medicine_prescribed}, 
        ${notes}, ${patient_type}, ${share}, ${tooth_number}, ${treatment_done}, ${xrays}, ${payments}, ${userEmail}
      )
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}
