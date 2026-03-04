import { NextResponse } from 'next/server';
import { withAuthOnly } from '@/lib/api-handler';
import { getClinics, createClinic } from '@/services/clinic.service';

export const GET = withAuthOnly(async (userId, userEmail) => {
  const clinics = await getClinics(userEmail);
  return NextResponse.json(clinics);
});

export const POST = withAuthOnly(async (userId, userEmail, request) => {
  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 });
  }
  const newClinic = await createClinic(name, userEmail);
  return NextResponse.json(newClinic);
});
