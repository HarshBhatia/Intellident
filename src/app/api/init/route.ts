import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    
    // Create table if not exists
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
        xrays TEXT, -- JSON array of base64 strings
        payments TEXT, -- JSON array of payment records
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create treatments table
    await sql`
      CREATE TABLE IF NOT EXISTS treatments (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
    `;

    // Create doctors table
    await sql`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
    `;

    // Create expense_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
    `;

    // Create expenses table
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed treatments if empty
    const treatmentCount = await sql`SELECT COUNT(*) FROM treatments`;
    if (parseInt(treatmentCount[0].count) === 0) {
      await sql`
        INSERT INTO treatments (name) VALUES 
        ('Consultation'), ('Scaling & Polishing'), ('Root Canal Treatment'), 
        ('Extraction'), ('Composite Filling'), ('Ceramic Crown'), 
        ('Zirconia Crown'), ('Complete Denture'), ('Implants'), 
        ('Braces / Orthodontics'), ('Teeth Whitening'), ('X-Ray')
      `;
    }

    // Seed expense categories if empty
    const expCatCount = await sql`SELECT COUNT(*) FROM expense_categories`;
    if (parseInt(expCatCount[0].count) === 0) {
      await sql`
        INSERT INTO expense_categories (name) VALUES 
        ('Dental Materials'), ('Lab Charges'), ('Rent'), 
        ('Staff Salary'), ('Electricity & Utilities'), ('Marketing'), 
        ('Maintenance'), ('Miscellaneous')
      `;
    }

    // Seed doctors if empty
    const doctorCount = await sql`SELECT COUNT(*) FROM doctors`;
    if (parseInt(doctorCount[0].count) === 0) {
      await sql`
        INSERT INTO doctors (name) VALUES 
        ('Dr. Smith'), ('Dr. Jones'), ('Dr. Patel')
      `;
    }

    // Attempt to add columns if they don't exist (migrations)
    try {
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS xrays TEXT`;
      await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS payments TEXT`;
    } catch (e) {
      console.log('Migration note:', e);
    }

    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 });
  }
}
