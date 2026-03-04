import { neon } from '@netlify/neon';
import { PGlite } from '@electric-sql/pglite';

const globalForPglite = global as unknown as { 
  pglite?: any;
  pglitePromise?: Promise<any>;
};

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

  if (url) {
    // @netlify/neon automatically handles connection pooling
    // Use fetchOptions to optimize for serverless
    return neon(url.toString(), {
      fetchOptions: {
        cache: 'no-store', // Prevent stale data
        priority: 'high'   // Prioritize database requests
      }
    });
  }

  if (process.env.NODE_ENV === 'production') {
    const mockSql = async () => [];
    (mockSql as any).unsafe = async () => [];
    return mockSql as any;
  }

  const init = async () => {
    // Dynamic imports to prevent browser bundling crashes
    const path = await import('path');
    const fs = await import('fs');
    const os = await import('os');
    
    const dbPath = path.resolve(os.homedir(), '.intellident-pgdata');
    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
    const lockFile = path.join(dbPath, 'postmaster.pid');
    if (fs.existsSync(lockFile)) { try { fs.unlinkSync(lockFile); } catch (e) {} }
    const instance = new PGlite(dbPath.toString());
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
      for (let i = 1; i < strings.length; i++) query += `$${i}` + strings[i];
      const result = await pglite.query(query, values);
      return result.rows;
    } catch (err: any) {
      if (err?.message?.includes('Aborted')) { delete globalForPglite.pglite; delete globalForPglite.pglitePromise; }
      throw err;
    }
  };

  (sql as any).unsafe = async (query: string, params: any[] = []) => {
    try {
      const pglite = await getPglite();
      const result = await pglite.query(query, params);
      return result.rows;
    } catch (err: any) {
      if (err?.message?.includes('Aborted')) { delete globalForPglite.pglite; delete globalForPglite.pglitePromise; }
      throw err;
    }
  };

  return sql as any;
}