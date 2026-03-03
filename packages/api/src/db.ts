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
    const globalForPglite = global as unknown as { pglite: any };
    
    const initPglite = () => {
      const dbPath = path.resolve(process.cwd(), '.pgdata');
      console.log('📦 Initializing Local PGlite Database at:', dbPath);
      try {
        const instance = new PGlite(dbPath.toString());
        // Attach a simple flag to track if it's dead
        (instance as any)._isAborted = false;
        return instance;
      } catch (err) {
        console.error('FAILED TO INITIALIZE PGLITE:', err);
        throw err;
      }
    };

    if (!globalForPglite.pglite) {
      globalForPglite.pglite = initPglite();
    }

    const getPglite = () => {
      if (!globalForPglite.pglite || globalForPglite.pglite._isAborted) {
        globalForPglite.pglite = initPglite();
      }
      return globalForPglite.pglite;
    };

    // Create a shim that matches Neon's tagged template literal API
    const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
      const pglite = getPglite();
      
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
        // Mark as aborted so next call re-initializes
        pglite._isAborted = true;
        globalForPglite.pglite = undefined;
        throw err;
      }
    };

    // Add .unsafe() support for raw strings
    (sql as any).unsafe = async (query: string, params: any[] = []) => {
      const pglite = getPglite();
      try {
        await pglite.waitReady;
        const result = await pglite.query(query, params);
        return result.rows;
      } catch (err: any) {
        console.error('PGlite Unsafe Query Error:', err);
        pglite._isAborted = true;
        globalForPglite.pglite = undefined;
        throw err;
      }
    };

    return sql as any;
  }

  throw new Error("DATABASE_URL is not set and not in development mode.");
}
