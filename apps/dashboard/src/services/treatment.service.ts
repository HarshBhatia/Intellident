import { getDb } from '@intellident/api';

export interface Treatment {
  id: number;
  name: string;
  clinic_id: string;
}

export async function getTreatments(clinicId: string): Promise<Treatment[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const rows = await sql`SELECT * FROM treatments WHERE clinic_id = ${clinicId}`;
  return rows as Treatment[];
}

export async function createTreatment(name: string, clinicId: string): Promise<Treatment> {
  if (!name) throw new Error('Treatment name is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  const result = await sql`
    INSERT INTO treatments (name, clinic_id)
    VALUES (${name}, ${clinicId})
    ON CONFLICT (name, clinic_id) DO NOTHING
    RETURNING *
  `;
  if (result.length === 0) {
      const existing = await sql`SELECT * FROM treatments WHERE name = ${name} AND clinic_id = ${clinicId}`;
      return existing[0] as Treatment;
  }
  return result[0] as Treatment;
}

export async function deleteTreatment(id: number, clinicId: string): Promise<void> {
  if (!id) throw new Error('Treatment ID is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  const result = await sql`DELETE FROM treatments WHERE id = ${id} AND clinic_id = ${clinicId} RETURNING id`;
  if (result.length === 0) {
    throw new Error('Treatment not found');
  }
}