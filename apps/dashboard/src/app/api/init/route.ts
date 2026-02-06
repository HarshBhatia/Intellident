import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';

export async function GET() {
  const sql = getDb();
  try {
    // 1. Create/Update Patients
    try {
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
          xrays TEXT,
          payments TEXT,
          user_email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_email TEXT`;
    } catch (e) { console.error('Error updating patients:', e); }

    // 2. Create/Update Other Tables
    const tables = ['treatments', 'doctors', 'expense_categories'];
    for (const table of tables) {
      try {
        await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (id SERIAL PRIMARY KEY, name TEXT NOT NULL, user_email TEXT)`);
        await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_email TEXT`);
        // Add composite unique constraint if missing
        try {
          await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_name_key`);
          await sql.unsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_name_user_email_key UNIQUE (name, user_email)`);
        } catch (err) {}
      } catch (e) { console.error(`Error updating ${table}:`, e); }
    }

    // 3. Expenses
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          date TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          user_email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_email TEXT`;
    } catch (e) { console.error('Error updating expenses:', e); }

    // 4. Clinic Info
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS clinic_info (
          id SERIAL PRIMARY KEY,
          clinic_name TEXT,
          owner_name TEXT,
          phone TEXT,
          address TEXT,
          email TEXT,
          google_maps_link TEXT,
          user_email TEXT UNIQUE
        );
      `;
      await sql`ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS google_maps_link TEXT`;
      await sql`ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS user_email TEXT`;
      try {
        await sql`ALTER TABLE clinic_info DROP CONSTRAINT IF EXISTS one_row`;
        await sql`ALTER TABLE clinic_info ADD CONSTRAINT clinic_info_user_email_key UNIQUE (user_email)`;
      } catch (err) {}
    } catch (e) { console.error('Error updating clinic_info:', e); }

    // 5. Migration complete
    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 });
  }
}