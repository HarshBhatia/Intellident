import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';

  try {
    const sql = getDb();
    await sql`SELECT 1`;
    return NextResponse.json({ status: 'ok', timestamp, environment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'database unreachable';
    return NextResponse.json(
      { status: 'error', timestamp, environment, error: message },
      { status: 503 }
    );
  }
}
