import { NextResponse } from 'next/server';
import { getPatients, createPatient, PatientFilters } from '@/services/patient.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const filters: PatientFilters = {
    search:          searchParams.get('search')           || undefined,
    gender:          searchParams.get('gender')           || undefined,
    patientType:     searchParams.get('patient_type')     || undefined,
    referralSource:  searchParams.get('referral_source')  || undefined,
    minAge:          searchParams.get('min_age')          ? Number(searchParams.get('min_age'))  : undefined,
    maxAge:          searchParams.get('max_age')          ? Number(searchParams.get('max_age'))  : undefined,
    hasBalance:      searchParams.get('has_balance')      === 'true' ? true : undefined,
    visitType:       searchParams.get('visit_type')       || undefined,
    start:           searchParams.get('start')            || undefined,
    end:             searchParams.get('end')              || undefined,
  };
  const hasFilters = Object.values(filters).some(v => v !== undefined);
  const patients = await getPatients(clinicId, hasFilters ? filters : {});
  return NextResponse.json(patients);
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const newPatient = await createPatient(clinicId, body);
  return NextResponse.json(newPatient);
});
