import { Metadata } from 'next';
import { getDb } from '@/lib/db';
import PatientDetailClient from './PatientDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const sql = getDb();
    const rows = await sql`SELECT name FROM patients WHERE patient_id = ${id}`;
    
    if (rows && rows.length > 0) {
      return {
        title: rows[0].name,
      };
    }
  } catch (error) {
    console.error('Metadata generation error:', error);
  }
  
  return {
    title: 'Patient Details',
  };
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <PatientDetailClient params={params} />;
}
