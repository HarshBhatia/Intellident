import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { collectVisitPayment } from '@/services/visit.service';

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const id = Number(body.id);
  const paid = Number(body.paid);
  if (!id) return NextResponse.json({ error: 'Visit id is required' }, { status: 400 });
  const visit = await collectVisitPayment(clinicId, id, paid);
  return NextResponse.json(visit);
}, { requiredPermission: 'payments.create' });
