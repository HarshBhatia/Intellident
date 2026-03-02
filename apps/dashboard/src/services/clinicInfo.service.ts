import { getDb } from '@intellident/api';

export interface ClinicInfo {
  clinic_name: string;
  owner_name: string;
  phone: string;
  address: string;
  email: string;
  google_maps_link: string;
}

export async function getClinicInfo(clinicId: string): Promise<ClinicInfo | null> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const rows = await sql`SELECT * FROM clinics WHERE id = ${clinicId}`;
  if (rows.length === 0) return null;
  
  const c = rows[0];
  return {
      clinic_name: c.name,
      owner_name: '', // We might need to fetch owner name separately or remove this requirement
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
      owner_name: '',
      phone: c.phone || '',
      address: c.address || '',
      email: c.owner_email || '',
      google_maps_link: c.google_maps_link || ''
  };
}