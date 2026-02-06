import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';

export async function GET() {
  const sql = getDb();
  
  try {
    // 1. Check which DB URL is active (masked)
    const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || 'NONE';
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':***@');
    
    // 2. Check Columns in patients table
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients'
    `;

    return NextResponse.json({
      connectedTo: maskedUrl,
      source: process.env.DATABASE_URL ? 'DATABASE_URL' : 'NETLIFY_DATABASE_URL',
      columns: columns.map(c => c.column_name)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
