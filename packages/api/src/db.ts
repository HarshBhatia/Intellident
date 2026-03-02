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
        console.error('FAILED TO INITIALIZE PGLITE:', err);
        throw err;
      }
    }

    const pgliteInstance = globalForPglite.pglite;

    // Create a shim that matches Neon's tagged template literal API
    const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
      const pglite = globalForPglite.pglite;
      if (!pglite) throw new Error("PGlite not initialized");
      
      try {
        await pglite.waitReady;
        let query = strings[0];
        for (let i = 1; i < strings.length; i++) {
          query += `$${i}` + strings[i];
        }
        const result = await pglite.query(query, values);
        return result.rows;
      } catch (err: any) {
        console.error('PGlite Query Error:', err);
        if (err?.message?.includes('Aborted') || err?.message?.includes('closed')) {
          globalForPglite.pglite = undefined;
        }
        throw err;
      }
    };

    // Add .unsafe() support for raw strings (used in init script)
    (sql as any).unsafe = async (query: string, params: any[] = []) => {
      const pglite = globalForPglite.pglite;
      if (!pglite) throw new Error("PGlite not initialized");

      try {
        await pglite.waitReady;
        const result = await pglite.query(query, params);
        return result.rows;
      } catch (err: any) {
        console.error('PGlite Unsafe Query Error:', err);
        if (err?.message?.includes('Aborted') || err?.message?.includes('closed')) {
          globalForPglite.pglite = undefined;
        }
        throw err;
      }
    };

    return sql as any;
  }

  throw new Error("DATABASE_URL is not set and not in development mode.");
}
