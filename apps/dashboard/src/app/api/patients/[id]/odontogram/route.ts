import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getOdontogram, saveOdontogram } from '@/services/odontogram.service';

type RouteParams = { params: Promise<{ id: string }> };

async function patientIdFrom(routeParams?: RouteParams): Promise<string> {
  const { id } = await routeParams!.params;
  return id;
}

export const GET = withAuth(async (_request, { clinicId }, routeParams: RouteParams) => {
  const id = await patientIdFrom(routeParams);
  const data = await getOdontogram(clinicId, id);
  return NextResponse.json(data);
});

export const PUT = withAuth(async (request, { clinicId, userEmail }, routeParams: RouteParams) => {
  const id = await patientIdFrom(routeParams);
  const body = await request.json();
  const data = await saveOdontogram(clinicId, id, body.chart ?? body, userEmail);
  return NextResponse.json(data);
}, { requiredPermission: 'clinical_notes.edit' });
