import { getDb } from '@intellident/api';

async function checkData() {
  const sql = getDb();
  
  console.log('Checking test data...\n');
  
  const clinics = await sql`SELECT * FROM clinics WHERE owner_email = 'test+clerk_test@example.com'`;
  console.log('Clinics:', clinics);
  
  if (clinics.length > 0) {
    const clinicId = clinics[0].id;
    
    const patients = await sql`SELECT * FROM patients WHERE clinic_id = ${clinicId}`;
    console.log('\nPatients:', patients.length);
    
    const categories = await sql`SELECT * FROM expense_categories WHERE clinic_id = ${clinicId}`;
    console.log('\nExpense Categories:', categories);
    
    const treatments = await sql`SELECT * FROM treatments WHERE clinic_id = ${clinicId}`;
    console.log('\nTreatments:', treatments);
    
    const members = await sql`SELECT * FROM clinic_members WHERE clinic_id = ${clinicId}`;
    console.log('\nClinic Members:', members);
  }
}

checkData().catch(console.error);
