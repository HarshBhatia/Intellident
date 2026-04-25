import { getDb } from '@intellident/api';

async function checkSchema() {
  const sql = getDb();
  
  console.log('Checking clinic_members table schema...\n');
  
  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'clinic_members'
    ORDER BY ordinal_position
  `;
  
  console.log('Columns in clinic_members table:');
  console.table(columns);
}

checkSchema().catch(console.error);
