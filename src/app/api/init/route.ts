import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    await sql`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        patient_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        amount NUMERIC,
        date TEXT,
        doctor TEXT,
        gender TEXT,
        mode_of_payment TEXT,
        paid_for TEXT,
        phone_number TEXT,
        medicine_prescribed TEXT,
        notes TEXT,
        patient_type TEXT,
        share TEXT,
        tooth_number TEXT,
        treatment_done TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 });
  }
}
