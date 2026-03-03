import { getDb } from '@intellident/api';
import { cookies, headers } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';

export const MOCK_E2E_USER = {
  userId: 'user_e2e_test',
  email: 'e2e@intellident.test'
};

export async function isE2E() {
  const headerList = await headers();
  const cookieStore = await cookies();
  const e2eSecret = headerList.get('x-e2e-secret') || cookieStore.get('x-e2e-secret')?.value;
  const secret = process.env.E2E_TEST_SECRET || 'e2e-secret-key';
  return e2eSecret === secret;
}

export async function getAuthContext() {
  const e2e = await isE2E();
  if (e2e) {
    const headerList = await headers();
    const cookieStore = await cookies();
    return {
      userId: headerList.get('x-e2e-user-id') || cookieStore.get('x-e2e-user-id')?.value || MOCK_E2E_USER.userId,
      userEmail: headerList.get('x-e2e-user-email') || cookieStore.get('x-e2e-user-email')?.value || MOCK_E2E_USER.email,
      isE2E: true
    };
  }

  const { userId } = await auth();
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  return { userId, userEmail, isE2E: false };
}

export async function getClinicId() {
  const cookieStore = await cookies();
  const headerList = await headers();
  return cookieStore.get('clinic_id')?.value || headerList.get('x-clinic-id');
}

export async function verifyMembership(clinicId: number | string, userEmail: string, userId?: string): Promise<boolean> {
  if (await isE2E() && userEmail === MOCK_E2E_USER.email) return true;

  const sql = getDb();
  const cId = typeof clinicId === 'string' ? parseInt(clinicId) : clinicId;
  if (isNaN(cId)) return false;

  try {
    if (userId) {
      const result = await sql`
        SELECT 1 FROM clinic_members 
        WHERE clinic_id = ${cId} AND user_id = ${userId} AND status = 'ACTIVE'
      `;
      if (result.length > 0) return true;
    }

    const result = await sql`
      SELECT id FROM clinic_members 
      WHERE clinic_id = ${cId} AND user_email = ${userEmail} AND status = 'ACTIVE'
    `;
    
    if (result.length > 0 && userId) {
      sql`UPDATE clinic_members SET user_id = ${userId} WHERE id = ${result[0].id}`.catch(console.error);
      return true;
    }

    return result.length > 0;
  } catch (error) {
    console.error('Membership verification failed:', error);
    return false;
  }
}

export async function getMemberRole(clinicId: number | string, userEmail: string, userId?: string): Promise<string | null> {
  if (await isE2E() && userEmail === MOCK_E2E_USER.email) return 'OWNER';

  const sql = getDb();
  const cId = typeof clinicId === 'string' ? parseInt(clinicId) : clinicId;
  if (isNaN(cId)) return null;

  try {
    if (userId) {
      const result = await sql`
        SELECT role FROM clinic_members 
        WHERE clinic_id = ${cId} AND user_id = ${userId} AND status = 'ACTIVE'
      `;
      if (result.length > 0) return result[0].role;
    }

    const result = await sql`
      SELECT role FROM clinic_members 
      WHERE clinic_id = ${cId} AND user_email = ${userEmail} AND status = 'ACTIVE'
    `;
    return result.length > 0 ? result[0].role : null;
  } catch (error) {
    console.error('Role fetch failed:', error);
    return null;
  }
}