import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getDoctors, createDoctor, deleteDoctor } from '@/services/doctor.service';

export const GET = withAuth(async (context) => {
  const doctors = await getDoctors(context.clinicId);
  return NextResponse.json(doctors);
});

export const POST = withAuth(async (context, request) => {
  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Doctor name is required' }, { status: 400 });
  }
  const newDoctor = await createDoctor(name, context.clinicId);
  return NextResponse.json(newDoctor);
});

export const DELETE = withAuth(async (context, request) => {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
  }
  await deleteDoctor(id, context.clinicId);
  return NextResponse.json({ success: true });
});
