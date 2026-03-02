import { getDb } from '@intellident/api';

export interface ClinicMember {
  id: number;
  clinic_id: number;
  user_email: string;
  role: string;
  status: string;
  created_at: string;
}

export async function getClinicMembers(clinicId: string): Promise<ClinicMember[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);
  const members = await sql`SELECT id, user_email, role, status FROM clinic_members WHERE clinic_id = ${cId}`;
  return members as ClinicMember[];
}

export async function addClinicMember(clinicId: string, email: string): Promise<ClinicMember> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!email) throw new Error('User email is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  // Default role is DOCTOR for now
  const result = await sql`
    INSERT INTO clinic_members (clinic_id, user_email, role, status)
    VALUES (${cId}, ${email}, 'DOCTOR', 'ACTIVE')
    ON CONFLICT (clinic_id, user_email) DO NOTHING
    RETURNING *
  `;
  
  if (result.length === 0) {
    // If it was a conflict, retrieve the existing member
    const existingMember = await sql`SELECT id, user_email, role, status FROM clinic_members WHERE clinic_id = ${cId} AND user_email = ${email}`;
    return existingMember[0] as ClinicMember;
  }

  return result[0] as ClinicMember;
}

export async function removeClinicMember(clinicId: string, id: string): Promise<void> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!id) throw new Error('Member ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const result = await sql`DELETE FROM clinic_members WHERE id = ${id} AND clinic_id = ${cId} RETURNING id`;
  if (result.length === 0) {
    throw new Error('Member not found');
  }
}