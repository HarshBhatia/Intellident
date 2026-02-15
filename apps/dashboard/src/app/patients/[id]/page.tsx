import { Metadata } from 'next';
import { getDb } from '@/lib/db';
import PatientDetailClient from './PatientDetailClient';
import { Suspense } from 'react';
import Skeleton from '@/components/Skeleton';
import { cookies } from 'next/headers';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const clinicId = (await cookies()).get('clinic_id')?.value;
  
  if (!clinicId) return { title: 'Patient Details' };

  try {
    const sql = getDb();
    const rows = await sql`SELECT name FROM patients WHERE patient_id = ${id} AND clinic_id = ${clinicId}`;
    
    if (rows && rows.length > 0) {
      return {
        title: `${rows[0].name} | IntelliDent`,
      };
    }
  } catch (error) {
    console.error('Metadata generation error:', error);
  }
  
  return {
    title: 'Patient Details',
  };
}

function PatientDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center"><Skeleton className="h-10 w-48" /><Skeleton className="h-10 w-32" /></div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PatientDetailLoading />}>
      <PatientDetailClient params={params} />
    </Suspense>
  );
}
