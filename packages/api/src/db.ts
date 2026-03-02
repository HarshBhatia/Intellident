import { neon } from '@netlify/neon';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

  // Use Neon for Cloud (Dev/Prod)
  if (url) {
    console.log('🐘 Using Neon Database (Remote)');
    return neon(url.toString());
  }

  // Use PGlite for Local Development
  if (process.env.NODE_ENV !== 'production') {
    const globalForPglite = global as unknown as { pglite: PGlite | undefined };
    
    if (!globalForPglite.pglite) {
      const dbPath = path.resolve(process.cwd(), '.pgdata');
      console.log('📦 Initializing Local PGlite Database at:', dbPath);
      try {
        globalForPglite.pglite = new PGlite(dbPath.toString());
      } catch (err) {
        console.error('Failed to initialize PGlite:', err);
        throw err;
      }
    }

    const pgliteInstance = globalForPglite.pglite;

    // Create a shim that matches Neon's tagged template literal API
    const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
      if (!pgliteInstance) throw new Error("PGlite instance not initialized");
      let query = strings[0];
      for (let i = 1; i < strings.length; i++) {
        query += `$${i}` + strings[i];
      }
      try {
        const result = await pgliteInstance.query(query, values);
        return result.rows;
      } catch (err) {
        console.error('PGlite Query Error:', err);
        throw err;
      }
    };

    // Add .unsafe() support for raw strings (used in init script)
    (sql as any).unsafe = async (query: string, params: any[] = []) => {
      if (!pgliteInstance) throw new Error("PGlite instance not initialized");
      try {
        const result = await pgliteInstance.query(query, params);
        return result.rows;
      } catch (err) {
        console.error('PGlite Unsafe Query Error:', err);
        throw err;
      }
    };

    return sql as any;
  }

  throw new Error("DATABASE_URL is not set and not in development mode.");
}
