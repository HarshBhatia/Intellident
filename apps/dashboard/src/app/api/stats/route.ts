import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getClinicStats } from '@/services/stats.service';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end are required' }, { status: 400 });
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }
  const stats = await getClinicStats(clinicId, startDate, endDate);
  return NextResponse.json(stats);
}, { requiredPermission: 'billing.admin' });
