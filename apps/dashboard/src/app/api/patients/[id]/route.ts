import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getPatientByIdWithVisits, updatePatient, deletePatient, softDeletePatient } from '@/services/patient.service';

type RouteParams = { params: Promise<{ id: string }> };

async function patientIdFrom(routeParams?: RouteParams): Promise<string> {
  const { id } = await routeParams!.params;
  return id;
}

export const GET = withAuth(async (_request, { clinicId }, routeParams: RouteParams) => {
  const id = await patientIdFrom(routeParams);
  const patient = await getPatientByIdWithVisits(clinicId, id);
  if (!patient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(patient);
});

export const PUT = withAuth(async (request, { clinicId }, routeParams: RouteParams) => {
  const id = await patientIdFrom(routeParams);
  const body = await request.json();
  const updatedPatient = await updatePatient(clinicId, id, body);
  return NextResponse.json(updatedPatient);
}, { requiredPermission: 'patients.update' });

export const DELETE = withAuth(async (request, { clinicId }, routeParams: RouteParams) => {
  const id = await patientIdFrom(routeParams);
  const { searchParams } = new URL(request.url);
  const isHardDelete = searchParams.get('hard') === 'true';

  if (isHardDelete) {
    await deletePatient(clinicId, id);
  } else {
    await softDeletePatient(clinicId, id);
  }

  return NextResponse.json({ success: true });
}, { requiredPermission: 'patients.delete' });
