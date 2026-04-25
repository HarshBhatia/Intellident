import { NextResponse } from 'next/server';
import { getAppointmentDatesInMonth } from '@/services/appointment.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '');
  const month = parseInt(searchParams.get('month') || '');
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Valid year and month parameters are required' }, { status: 400 });
  }
  const doctor = searchParams.get('doctor') || undefined;
  const dates = await getAppointmentDatesInMonth(clinicId, year, month, doctor);
  return NextResponse.json(dates);
});
