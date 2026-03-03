import { neon } from '@netlify/neon';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Standard Next.js singleton pattern for development
const globalForPglite = global as unknown as { 
  pglite?: any;
  pglitePromise?: Promise<any>;
};

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

  if (url) {
    return neon(url.toString());
  }

  if (process.env.NODE_ENV !== 'production') {
    // Use a path in the user's home directory to avoid monorepo/filesystem issues
    const dbPath = path.resolve(os.homedir(), '.intellident-pgdata');

    const init = async () => {
      console.log('📦 Initializing In-Memory PGlite Database');
      const instance = new PGlite();
      await instance.waitReady;
      return instance;
    };

    const getPglite = async () => {
      if (globalForPglite.pglite) return globalForPglite.pglite;
      
      if (!globalForPglite.pglitePromise) {
        globalForPglite.pglitePromise = init().then(inst => {
          globalForPglite.pglite = inst;
          return inst;
        });
      }
      
      return globalForPglite.pglitePromise;
    };

    const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
      try {
        const pglite = await getPglite();
        let query = strings[0];
        for (let i = 1; i < strings.length; i++) {
          query += `$${i}` + strings[i];
        }
        const result = await pglite.query(query, values);
        return result.rows;
      } catch (err: any) {
        console.error('PGlite Query Error:', err);
        if (err?.message?.includes('Aborted')) {
          delete globalForPglite.pglite;
          delete globalForPglite.pglitePromise;
        }
        throw err;
      }
    };

    (sql as any).unsafe = async (query: string, params: any[] = []) => {
      try {
        const pglite = await getPglite();
        const result = await pglite.query(query, params);
        return result.rows;
      } catch (err: any) {
        console.error('PGlite Unsafe Query Error:', err);
        if (err?.message?.includes('Aborted')) {
          delete globalForPglite.pglite;
          delete globalForPglite.pglitePromise;
        }
        throw err;
      }
    };

    return sql as any;
  }

  throw new Error("DATABASE_URL not set.");
}