import { initializeDatabase } from '@intellident/api/src/init-db';

async function main() {
  if (process.env.NODE_ENV === 'production' && !(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL)) {
    console.error('DATABASE_URL is required to migrate production');
    process.exit(1);
  }

  const result = await initializeDatabase();
  if (!result.success) {
    console.error('Migration failed:', result.error);
    process.exit(1);
  }
  console.log(result.message || 'Database migrated');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
