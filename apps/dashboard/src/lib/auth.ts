import { getDb } from '@intellident/api';
import { cookies, headers } from 'next/headers';

export async function getClinicId() {
  const cookieStore = await cookies();
  const headerList = await headers();
  return cookieStore.get('clinic_id')?.value || headerList.get('x-clinic-id');
}

export async function verifyMembership(clinicId: number | string, userEmail: string): Promise<boolean> {
  const sql = getDb();
  try {
    const result = await sql`
      SELECT 1 FROM clinic_members 
      WHERE clinic_id = ${clinicId} 
      AND user_email = ${userEmail}
      AND status = 'ACTIVE'
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Membership verification failed:', error);
    return false;
  }
}
