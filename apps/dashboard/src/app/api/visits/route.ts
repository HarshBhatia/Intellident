import { NextResponse } from 'next/server';
import { getVisits, createVisit, deleteVisit, updateVisit, VisitFilters } from '@/services/visit.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const filters: VisitFilters = {
    patientId:  searchParams.get('patientId')  || undefined,
    start:      searchParams.get('start')       || undefined,
    end:        searchParams.get('end')         || undefined,
    visitType:  searchParams.get('visit_type')  || undefined,
    doctor:     searchParams.get('doctor')      || undefined,
    search:     searchParams.get('search')      || undefined,
  };
  const visits = await getVisits(clinicId, filters);
  return NextResponse.json(visits);
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const newVisit = await createVisit(clinicId, body);
  return NextResponse.json(newVisit);
});

export const DELETE = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Visit ID is required' }, { status: 400 });
  await deleteVisit(clinicId, id);
  return NextResponse.json({ success: true });
}, { requiredPermission: 'visits.delete' });

export const PUT = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const updatedVisit = await updateVisit(clinicId, body);
  return NextResponse.json(updatedVisit);
}, { requiredPermission: 'clinical_notes.edit' });
