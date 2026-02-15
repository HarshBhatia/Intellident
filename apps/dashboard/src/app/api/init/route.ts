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
          patient_id TEXT NOT NULL,
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
          clinic_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      // Fix constraints for multi-tenancy
      try {
        await sql`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_patient_id_key`;
        await sql`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_patient_id_clinic_id_key`;
        await sql`ALTER TABLE patients ADD CONSTRAINT patients_patient_id_clinic_id_key UNIQUE (patient_id, clinic_id)`;
      } catch (err) { console.error('Error updating patient constraints:', err); }
      
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_email TEXT`;
    } catch (e) { console.error('Error updating patients:', e); }

    // 2. Create/Update Other Tables
    const tables = ['treatments', 'doctors', 'expense_categories'];
    for (const table of tables) {
      try {
        await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`);
        await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS clinic_id INTEGER`);
        await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_email TEXT`);
        
        // Add composite unique constraint for multi-tenancy
        try {
          await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_name_key`);
          await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_name_user_email_key`);
          await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_name_clinic_id_key`);
          await sql.unsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_name_clinic_id_key UNIQUE (name, clinic_id)`);
        } catch (err) { console.log(`Note: constraint update for ${table} had a non-critical error`); }
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
      await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS clinic_id INTEGER`;
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

    // ---------------------------------------------------------
    // PHASE 1: Create Core Organization Tables
    // ---------------------------------------------------------
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS clinics (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          owner_email TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          google_maps_link TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS clinic_members (
          id SERIAL PRIMARY KEY,
          clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
          user_email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'DOCTOR', -- OWNER, DOCTOR, RECEPTIONIST
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(clinic_id, user_email)
        );
      `;
    } catch (e) { console.error('Error creating org tables:', e); }

    // ---------------------------------------------------------
    // PHASE 2: Add clinic_id to all data tables
    // ---------------------------------------------------------
    const dataTables = ['patients', 'treatments', 'doctors', 'expense_categories', 'expenses'];
    for (const table of dataTables) {
      try {
        await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS clinic_id INTEGER`);
      } catch (e) { console.log(`Note: clinic_id already on ${table}`); }
    }

    // ---------------------------------------------------------
    // PHASE 3: Migrate Existing Users to Clinics
    // ---------------------------------------------------------
    // 1. Find all users who have data but no clinic yet
    try {
      // Get unique users from patients table who don't have a clinic association yet
      const usersWithData = await sql`
        SELECT DISTINCT user_email FROM patients 
        WHERE user_email IS NOT NULL 
        AND clinic_id IS NULL
      `;

      for (const u of usersWithData) {
        const email = u.user_email;
        
        // Check if they already have a clinic owned by them to prevent duplicates
        const existingClinic = await sql`SELECT id FROM clinics WHERE owner_email = ${email} LIMIT 1`;
        
        let clinicId;
        if (existingClinic.length > 0) {
          clinicId = existingClinic[0].id;
        } else {
          // Create a new Default Clinic for this user
          // Try to fetch clinic_info name if available, else Default
          const info = await sql`SELECT clinic_name FROM clinic_info WHERE user_email = ${email} LIMIT 1`;
          const clinicName = info[0]?.clinic_name || 'My Clinic';
          
          const newClinic = await sql`
            INSERT INTO clinics (name, owner_email) VALUES (${clinicName}, ${email}) RETURNING id
          `;
          clinicId = newClinic[0].id;

          // Add them as OWNER
          await sql`
            INSERT INTO clinic_members (clinic_id, user_email, role) 
            VALUES (${clinicId}, ${email}, 'OWNER')
          `;
        }

        // Migrate their data to this clinic
        for (const table of dataTables) {
          await sql.unsafe(`
            UPDATE ${table} 
            SET clinic_id = ${clinicId} 
            WHERE user_email = '${email}' 
            AND clinic_id IS NULL
          `);
        }
        console.log(`Migrated data for ${email} to Clinic ID ${clinicId}`);
      }
    } catch (e) {
      console.error('Migration Phase 3 Error:', e);
    }

    // ---------------------------------------------------------
    // PHASE 4: Refactor to Visits Model
    // ---------------------------------------------------------
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS visits (
          id SERIAL PRIMARY KEY,
          clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          doctor TEXT,
          visit_type TEXT DEFAULT 'Consultation',
          symptoms TEXT,
          diagnosis TEXT,
          treatment_plan TEXT,
          treatment_done TEXT,
          tooth_number TEXT,
          medicine_prescribed TEXT,
          notes TEXT,
          cost NUMERIC DEFAULT 0,
          paid NUMERIC DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_type TEXT DEFAULT 'Consultation'`;

      // Migrate existing clinical data to visits if visits table is empty
      const existingVisits = await sql`SELECT COUNT(*) FROM visits`;
      if (existingVisits[0].count == 0) {
        console.log('Migrating clinical data to visits...');
        await sql`
          INSERT INTO visits (
            clinic_id, patient_id, date, doctor, 
            treatment_done, tooth_number, medicine_prescribed, 
            notes, cost
          )
          SELECT 
            clinic_id, id, date, doctor, 
            treatment_done, tooth_number, medicine_prescribed, 
            notes, amount
          FROM patients
          WHERE clinic_id IS NOT NULL;
        `;
        console.log('Migration complete.');
      }
    } catch (e) { console.error('Error creating visits table:', e); }
      
    // ---------------------------------------------------------
    // PHASE 5: Performance Optimization (Indexes)
    // ---------------------------------------------------------
    try {
      const tablesToIndex = ['patients', 'visits', 'treatments', 'doctors', 'expense_categories', 'expenses'];
      for (const table of tablesToIndex) {
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_${table}_clinic_id ON ${table}(clinic_id)`);
      }
      // Index for patient history lookups
      await sql`CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id)`;
      console.log('Performance indexes created.');
    } catch (e) { console.error('Error creating indexes:', e); }

    return NextResponse.json({ message: 'Database initialized & optimized successfully' });

  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 });
  }
}