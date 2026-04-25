import { NextResponse } from 'next/server';
import { getTreatments, createTreatment, deleteTreatment } from '@/services/treatment.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (_request: Request, { clinicId }) => {
  const treatments = await getTreatments(clinicId);
  return NextResponse.json(treatments);
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: 'Treatment name is required' }, { status: 400 });

  const newTreatment = await createTreatment(name, clinicId);
  return NextResponse.json(newTreatment);
});

export const DELETE = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Treatment ID is required' }, { status: 400 });

  await deleteTreatment(id, clinicId);
  return NextResponse.json({ success: true });
});
