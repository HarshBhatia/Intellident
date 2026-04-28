import { getDb } from './index';

/**
 * Initialize database schema and indexes.
 * This should be called during application startup or deployment.
 * 
 * Usage:
 * - In development: Run `npm run db:init` or call from middleware
 * - In production: Run as part of deployment process (Vercel build step)
 */
export async function initializeDatabase() {
  const sql = getDb();
  
  try {
    // 1. Create/Update Patients
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
    } catch (err) {
      // Constraint already exists
    }
    
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_email TEXT`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_type TEXT`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS xrays TEXT`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source TEXT`;

    // 2. Create/Update Other Tables (removed doctors table)
    const tables = ['treatments', 'expense_categories'];
    for (const table of tables) {
      await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`);
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS clinic_id INTEGER`);
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_email TEXT`);
      
      try {
        await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_name_clinic_id_key`);
        await sql.unsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_name_clinic_id_key UNIQUE (name, clinic_id)`);
      } catch (err) {
        // Constraint already exists
      }
    }

    // 3. Expenses
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

    // 4. Organization Tables
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
    await sql`ALTER TABLE clinic_members ADD COLUMN IF NOT EXISTS display_name TEXT`;
    
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON clinic_members(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_user ON clinic_members(clinic_id, user_id) WHERE status = 'ACTIVE'`;
      await sql`CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_email ON clinic_members(clinic_id, user_email) WHERE status = 'ACTIVE'`;
      await sql`CREATE INDEX IF NOT EXISTS idx_clinic_members_role ON clinic_members(clinic_id, role) WHERE status = 'ACTIVE'`;
    } catch (err) {
      // Indexes already exist
    }

    // 5. Visits Table
    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        doctor TEXT,
        doctor_email TEXT,
        doctor_user_id TEXT,
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
    await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS doctor_email TEXT`;
    await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS doctor_user_id TEXT`;

    // 6. Usage Logs
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
      
    // 7. Appointments Table
    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
        patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
        walk_in_name TEXT,
        walk_in_phone TEXT,
        doctor_email TEXT,
        doctor_name TEXT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        visit_type TEXT DEFAULT 'Consultation',
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        notes TEXT,
        visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 8. Performance Indexes
    const dataTables = ['patients', 'visits', 'treatments', 'expense_categories', 'expenses', 'appointments'];
    for (const table of dataTables) {
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_${table}_clinic_id ON ${table}(clinic_id)`);
    }
    
    // Composite indexes for common query patterns
    await sql`CREATE INDEX IF NOT EXISTS idx_visits_clinic_patient ON visits(clinic_id, patient_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_visits_clinic_date ON visits(clinic_id, date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_visits_clinic_doctor ON visits(clinic_id, doctor_email) WHERE doctor_email IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_patients_clinic_active ON patients(clinic_id) WHERE is_active = TRUE`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_clinic_date ON expenses(clinic_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_appointments_clinic_doctor_date ON appointments(clinic_id, doctor_email, date)`;
    
    // 8. Drop doctors table if it exists (consolidated to clinic_members)
    try {
      await sql`DROP TABLE IF EXISTS doctors CASCADE`;
    } catch (err) {
      // Table doesn't exist or can't be dropped
    }

    return { success: true, message: 'Database initialized successfully' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
