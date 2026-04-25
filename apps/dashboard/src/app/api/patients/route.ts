import { NextResponse } from 'next/server';
import { getPatients, createPatient } from '@/services/patient.service';
import { withAuth } from '@/lib/api-handler';

export const revalidate = 30;

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const patients = await getPatients(clinicId);
  return NextResponse.json(patients, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const newPatient = await createPatient(clinicId, body);
  return NextResponse.json(newPatient);
});
