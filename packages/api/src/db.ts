import { neon } from '@netlify/neon';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';

let pgliteInstance: any = null;

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

  // Use Neon for Cloud (Dev/Prod)
  if (url) {
    console.log('🐘 Using Neon Database (Remote)');
    return neon(url.toString());
  }

  // Use PGlite for Local Development
  if (process.env.NODE_ENV !== 'production') {
    if (!pgliteInstance) {
      const dbPath = path.resolve(process.cwd(), '.pgdata');
      console.log('📦 Initializing Local PGlite Database at:', dbPath);
      pgliteInstance = new PGlite(dbPath.toString());
    }

    // Create a shim that matches Neon's tagged template literal API
    const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
      let query = strings[0];
      for (let i = 1; i < strings.length; i++) {
        query += `$${i}` + strings[i];
      }
      const result = await pgliteInstance.query(query, values);
      return result.rows;
    };

    // Add .unsafe() support for raw strings (used in init script)
    (sql as any).unsafe = async (query: string, params: any[] = []) => {
      const result = await pgliteInstance.query(query, params);
      return result.rows;
    };

    return sql as any;
  }

  throw new Error("DATABASE_URL is not set and not in development mode.");
}
