import { getDb } from '@intellident/api';

export interface Doctor {
  id: number;
  name: string;
  clinic_id: string;
}

export async function getDoctors(clinicId: string): Promise<Doctor[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const rows = await sql`SELECT * FROM doctors WHERE clinic_id = ${clinicId}`;
  return rows as Doctor[];
}

export async function createDoctor(name: string, clinicId: string): Promise<Doctor> {
  if (!name) throw new Error('Doctor name is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  
  const result = await sql`
    INSERT INTO doctors (name, clinic_id)
    VALUES (${name}, ${clinicId})
    ON CONFLICT (name, clinic_id) DO NOTHING
    RETURNING *
  `;
  
  if (result.length === 0) {
      const existing = await sql`SELECT * FROM doctors WHERE name = ${name} AND clinic_id = ${clinicId}`;
      return existing[0] as Doctor;
  }

  return result[0] as Doctor;
}

export async function deleteDoctor(id: number, clinicId: string): Promise<void> {
  if (!id) throw new Error('Doctor ID is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  const result = await sql`DELETE FROM doctors WHERE id = ${id} AND clinic_id = ${clinicId} RETURNING id`;
  if (result.length === 0) {
    throw new Error('Doctor not found');
  }
}