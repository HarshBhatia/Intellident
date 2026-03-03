import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';

export async function GET(request: Request) {
  // Security Check
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('x-init-secret');
  const expectedSecret = process.env.E2E_TEST_SECRET || 'e2e-secret-key';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  try {
    // 1. Create/Update Patients
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS patients (
          id SERIAL PRIMARY KEY,
          patient_id TEXT NOT NULL,
          name TEXT NOT NULL,
          age INTEGER,
          gender TEXT,
          phone_number TEXT,
          patient_type TEXT,
          user_email TEXT,
          clinic_id INTEGER,
          is_active BOOLEAN DEFAULT TRUE,
          xrays TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      try {
        await sql`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_patient_id_key`;
        await sql`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_patient_id_clinic_id_key`;
        await sql`ALTER TABLE patients ADD CONSTRAINT patients_patient_id_clinic_id_key UNIQUE (patient_id, clinic_id)`;
      } catch (err) {}
      
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_email TEXT`;
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_type TEXT`;
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS xrays TEXT`;

    } catch (e) { console.error('Error updating patients:', e); }

    // 2. Create/Update Other Tables
    const tables = ['treatments', 'doctors', 'expense_categories'];
    for (const table of tables) {
      try {
        await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`);
        await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS clinic_id INTEGER`);
        await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_email TEXT`);
        try {
          await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_name_clinic_id_key`);
          await sql.unsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_name_clinic_id_key UNIQUE (name, clinic_id)`);
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
          clinic_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
    } catch (e) { console.error('Error updating expenses:', e); }

    // 4. Organization Tables
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS clinics (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          owner_email TEXT NOT NULL,
          owner_id TEXT,
          address TEXT,
          phone TEXT,
          google_maps_link TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS owner_id TEXT`;
      
      await sql`
        CREATE TABLE IF NOT EXISTS clinic_members (
          id SERIAL PRIMARY KEY,
          clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
          user_email TEXT NOT NULL,
          user_id TEXT,
          role TEXT NOT NULL DEFAULT 'DOCTOR',
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(clinic_id, user_email)
        );
      `;
      await sql`ALTER TABLE clinic_members ADD COLUMN IF NOT EXISTS user_id TEXT`;
      try {
        await sql`CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON clinic_members(user_id)`;
      } catch (err) {}
    } catch (e) { console.error('Error creating org tables:', e); }

    // 5. Visits Table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS visits (
          id SERIAL PRIMARY KEY,
          clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          doctor TEXT,
          visit_type TEXT DEFAULT 'Consultation',
          clinical_findings TEXT,
          procedure_notes TEXT,
          tooth_number TEXT,
          medicine_prescribed TEXT,
          cost NUMERIC DEFAULT 0,
          paid NUMERIC DEFAULT 0,
          xrays TEXT,
          billing_items TEXT,
          dentition_type TEXT DEFAULT 'Adult',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS dentition_type TEXT DEFAULT 'Adult'`;
      await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS billing_items TEXT`;

      // Resilient legacy migration
      try {
        await sql`
          UPDATE visits 
          SET clinical_findings = COALESCE(diagnosis, '') || ' ' || COALESCE(symptoms, ''),
              procedure_notes = COALESCE(treatment_done, '') || ' ' || COALESCE(notes, '')
          WHERE clinical_findings IS NULL OR clinical_findings = ''
        `;
      } catch (err) {}
    } catch (e) { console.error('Error creating visits table:', e); }

    // 6. Usage Logs
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS usage_logs (
          id SERIAL PRIMARY KEY,
          clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
          user_id TEXT,
          feature TEXT NOT NULL,
          status TEXT,
          metadata TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_usage_logs_clinic_id_created_at ON usage_logs(clinic_id, created_at)`;
    } catch (e) {}
      
    // 7. Indexes
    try {
      const dataTables = ['patients', 'visits', 'treatments', 'doctors', 'expense_categories', 'expenses'];
      for (const table of dataTables) {
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_${table}_clinic_id ON ${table}(clinic_id)`);
      }
      await sql`CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id)`;
    } catch (e) {}

    return NextResponse.json({ message: 'Database initialized & optimized successfully' });
  } catch (error: any) {
    console.error('Database initialization error:', error);
    return NextResponse.json({ error: 'Failed to initialize database', details: error.message }, { status: 500 });
  }
}
