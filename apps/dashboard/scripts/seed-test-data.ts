import { getDb } from '@intellident/api';
import { initializeDatabase } from '@intellident/api/src/init-db';

async function seedTestData() {
  console.log('🔧 Initializing database schema...');
  const initResult = await initializeDatabase();
  if (!initResult.success) {
    console.error('❌ Failed to initialize database:', initResult.error);
    process.exit(1);
  }
  console.log('✅ Database schema initialized\n');
  
  const sql = getDb();
  
  // Test user details from Clerk
  const testUserEmail = 'test+clerk_test@example.com';
  const testUserId = 'user_3AVkSYQbMFyU6TTnzCf1hA9ASeo';
  
  // Get or create the test user's clinic
  let clinics = await sql`
    SELECT id, name FROM clinics 
    WHERE owner_email = ${testUserEmail}
    LIMIT 1
  `;
  
  let clinicId: number;
  
  if (clinics.length === 0) {
    console.log('No clinic found for test user. Creating one...');
    
    const result = await sql`
      INSERT INTO clinics (name, owner_email, owner_id, created_at)
      VALUES ('Test Clinic', ${testUserEmail}, ${testUserId}, NOW())
      RETURNING id, name
    `;
    
    clinicId = result[0].id;
    console.log('Created clinic:', result[0]);
  } else {
    clinicId = clinics[0].id;
    console.log('Found existing clinic:', clinics[0]);
  }
  
  // Add test user as clinic member with correct user_id
  await sql`
    INSERT INTO clinic_members (clinic_id, user_email, role, user_id)
    VALUES (${clinicId}, ${testUserEmail}, 'OWNER', ${testUserId})
    ON CONFLICT (clinic_id, user_email) DO UPDATE SET user_id = ${testUserId}
  `;
  
  console.log('Added clinic member');
  
  // Create some test patients
  const patients = [
    { patient_id: 'PID-001', name: 'John Doe', phone: '1234567890', age: 35, gender: 'Male' },
    { patient_id: 'PID-002', name: 'Jane Smith', phone: '0987654321', age: 28, gender: 'Female' },
    { patient_id: 'PID-003', name: 'Bob Johnson', phone: '5555555555', age: 45, gender: 'Male' }
  ];
  
  for (const patient of patients) {
    await sql`
      INSERT INTO patients (patient_id, clinic_id, name, phone_number, age, gender, created_at)
      VALUES (
        ${patient.patient_id},
        ${clinicId}, ${patient.name}, ${patient.phone}, ${patient.age}, ${patient.gender}, NOW()
      )
      ON CONFLICT (patient_id, clinic_id) DO NOTHING
    `;
  }
  
  console.log('Created test patients');
  
  // Create expense categories
  const categories = ['Supplies', 'Equipment', 'Utilities', 'Salaries', 'Other'];
  
  for (const category of categories) {
    await sql`
      INSERT INTO expense_categories (clinic_id, name)
      VALUES (${clinicId}, ${category})
      ON CONFLICT (clinic_id, name) DO NOTHING
    `;
  }
  
  console.log('Created expense categories');
  
  // Create some treatments
  const treatments = ['Cleaning', 'Filling', 'Root Canal', 'Crown'];
  
  for (const treatment of treatments) {
    await sql`
      INSERT INTO treatments (clinic_id, name)
      VALUES (${clinicId}, ${treatment})
      ON CONFLICT (clinic_id, name) DO NOTHING
    `;
  }
  
  console.log('Created treatments');
  console.log('✅ Test data seeded successfully!');
}

seedTestData().catch(console.error);
