import { getDb } from './db';

async function checkMembers() {
  const sql = getDb();
  try {
    const members = await sql`SELECT * FROM clinic_members WHERE clinic_id = 1`;
    console.log('Members of Clinic 1:', members);
  } catch (e) {
    console.error(e);
  }
}

checkMembers();
