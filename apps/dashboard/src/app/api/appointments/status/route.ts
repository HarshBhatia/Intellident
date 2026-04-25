import { NextResponse } from 'next/server';
import { updateAppointmentStatus } from '@/services/appointment.service';
import { withAuth } from '@/lib/api-handler';

export const PUT = withAuth(async (request: Request, { clinicId }) => {
  const { id, status } = await request.json();
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
  }
  const appointment = await updateAppointmentStatus(clinicId, id, status);
  return NextResponse.json(appointment);
});
