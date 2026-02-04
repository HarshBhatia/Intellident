import { neon } from '@netlify/neon';

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("DATABASE_URL is not set. Creating a dummy connection that will fail if used.");
    return neon("postgres://dummy:dummy@localhost:5432/dummy"); 
  }
  return neon(url);
}

