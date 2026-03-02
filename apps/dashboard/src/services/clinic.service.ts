import { getDb } from '@intellident/api';

export interface Clinic {
  id: number;
  name: string;
  role: string;
}

export async function getClinics(userEmail: string): Promise<Clinic[]> {
  if (!userEmail) {
    throw new Error('User email is required');
  }
  const sql = getDb();
  const clinics = await sql`
    SELECT c.id, c.name, cm.role 
    FROM clinics c
    JOIN clinic_members cm ON c.id = cm.clinic_id
    WHERE cm.user_email = ${userEmail}
    ORDER BY c.created_at DESC
  `;
  return clinics as Clinic[];
}

export async function createClinic(name: string, userEmail: string): Promise<Clinic> {
  if (!name) {
    throw new Error('Clinic name is required');
  }
  if (!userEmail) {
    throw new Error('User email is required');
  }
  
  const sql = getDb();
  
  // 1. Create Clinic
  const newClinic = await sql`
    INSERT INTO clinics (name, owner_email) 
    VALUES (${name}, ${userEmail}) 
    RETURNING id, name
  `;
  const clinicId = newClinic[0].id;

  // 2. Add Member as Owner
  await sql`
    INSERT INTO clinic_members (clinic_id, user_email, role)
    VALUES (${clinicId}, ${userEmail}, 'OWNER')
  `;

  return { id: clinicId, name: newClinic[0].name, role: 'OWNER' };
}