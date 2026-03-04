import { getDb } from '@intellident/api';

// ============================================================================
// Types
// ============================================================================

export interface Clinic {
  id: number;
  name: string;
  role: string;
}

export interface ClinicInfo {
  clinic_name: string;
  owner_name: string;
  phone: string;
  address: string;
  email: string;
  google_maps_link: string;
}

export interface ClinicMember {
  id: number;
  clinic_id: number;
  user_email: string;
  role: string;
  status: string;
  created_at: string;
}

// ============================================================================
// Clinic Management
// ============================================================================

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

// ============================================================================
// Clinic Info
// ============================================================================

export async function getClinicInfo(clinicId: string): Promise<ClinicInfo | null> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const rows = await sql`SELECT * FROM clinics WHERE id = ${clinicId}`;
  if (rows.length === 0) return null;
  
  const c = rows[0];
  return {
      clinic_name: c.name,
      owner_name: c.owner_email || '', 
      phone: c.phone || '',
      address: c.address || '',
      email: c.owner_email || '',
      google_maps_link: c.google_maps_link || ''
  };
}

export async function updateClinicInfo(clinicId: string, clinicData: Partial<ClinicInfo>): Promise<ClinicInfo> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  
  const { clinic_name, phone, address, google_maps_link } = clinicData;

  const result = await sql`
    UPDATE clinics SET
      name = ${clinic_name},
      phone = ${phone},
      address = ${address},
      google_maps_link = ${google_maps_link}
    WHERE id = ${clinicId}
    RETURNING *
  `;
  
  if (result.length === 0) {
    throw new Error('Clinic not found');
  }

  const c = result[0];
  return {
      clinic_name: c.name,
      owner_name: c.owner_email || '',
      phone: c.phone || '',
      address: c.address || '',
      email: c.owner_email || '',
      google_maps_link: c.google_maps_link || ''
  };
}

// ============================================================================
// Clinic Members
// ============================================================================

export async function getClinicMembers(clinicId: string): Promise<ClinicMember[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);
  const members = await sql`SELECT id, user_email, role, status FROM clinic_members WHERE clinic_id = ${cId}`;
  return members as ClinicMember[];
}

export async function addClinicMember(clinicId: string, email: string, role: string = 'DOCTOR'): Promise<ClinicMember> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!email) throw new Error('User email is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const result = await sql`
    INSERT INTO clinic_members (clinic_id, user_email, role, status)
    VALUES (${cId}, ${email}, ${role}, 'ACTIVE')
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