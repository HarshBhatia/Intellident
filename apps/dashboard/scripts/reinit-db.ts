import { initializeDatabase } from '@intellident/api/src/init-db';

async function main() {
  console.log('Reinitializing database schema...');
  const result = await initializeDatabase();
  console.log('Result:', result);
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error('Failed to reinitialize database:', error);
  process.exit(1);
});
