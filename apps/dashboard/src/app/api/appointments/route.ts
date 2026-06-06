import { NextResponse } from 'next/server';
import {
  getAppointments,
  getAppointmentsByDate,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  AppointmentFilters,
} from '@/services/appointment.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const date  = searchParams.get('date')  || undefined;
  const start = searchParams.get('start') || undefined;
  const end   = searchParams.get('end')   || undefined;

  if (!date && !start && !end) {
    return NextResponse.json({ error: 'date, start, or end parameter is required' }, { status: 400 });
  }

  const filters: AppointmentFilters = {
    date,
    start,
    end,
    doctorEmail: searchParams.get('doctor')     || undefined,
    status:      searchParams.get('status')     || undefined,
    visitType:   searchParams.get('visit_type') || undefined,
  };
  const appointments = await getAppointments(clinicId, filters);
  return NextResponse.json(appointments);
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const appointment = await createAppointment(clinicId, body);
  return NextResponse.json(appointment);
});

export const PUT = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: 'Appointment id is required' }, { status: 400 });
  }
  const appointment = await updateAppointment(clinicId, body.id, body);
  return NextResponse.json(appointment);
});

export const DELETE = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
  }
  await deleteAppointment(clinicId, parseInt(id));
  return NextResponse.json({ success: true });
});
