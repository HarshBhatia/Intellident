import { getDb } from '@intellident/api';
import { Appointment, AppointmentStatus } from '@intellident/api/src/types';
import { createVisit } from './visit.service';

export interface AppointmentFilters {
  date?: string;
  start?: string;
  end?: string;
  doctorEmail?: string;
  status?: string;
  visitType?: string;
}

export async function getAppointments(
  clinicId: string,
  filters: AppointmentFilters = {}
): Promise<Appointment[]> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const { date, start, end, doctorEmail, status, visitType } = filters;

  let rows: any[] = await sql`
    SELECT a.*, p.name as patient_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE a.clinic_id = ${cId}
    ORDER BY a.date ASC, a.start_time ASC
  `;

  if (date)        rows = rows.filter(r => r.date === date);
  if (start)       rows = rows.filter(r => r.date >= start);
  if (end)         rows = rows.filter(r => r.date <= end);
  if (doctorEmail) rows = rows.filter(r => (r.doctor_email || '').toLowerCase().includes(doctorEmail.toLowerCase()));
  if (status)      rows = rows.filter(r => (r.status || '').toLowerCase() === status.toLowerCase());
  if (visitType)   rows = rows.filter(r => (r.visit_type || '').toLowerCase().includes(visitType.toLowerCase()));

  return rows as Appointment[];
}

export async function getAppointmentsByDate(
  clinicId: string,
  date: string,
  doctorEmail?: string
): Promise<Appointment[]> {
  return getAppointments(clinicId, { date, doctorEmail });
}

export async function createAppointment(
  clinicId: string,
  data: Partial<Appointment>
): Promise<Appointment> {
  const sql = getDb();
  const cId = parseInt(clinicId);

  if (!data.date || !data.start_time || !data.end_time) {
    throw new Error('Date, start time, and end time are required');
  }

  // Verify patient belongs to this clinic
  if (data.patient_id) {
    const patient = await sql`SELECT id FROM patients WHERE id = ${data.patient_id} AND clinic_id = ${cId}`;
    if (patient.length === 0) throw new Error('Patient not found in this clinic');
  }

  if (data.start_time >= data.end_time) {
    throw new Error('Start time must be before end time');
  }

  // Check for overlapping appointments for the same doctor
  if (data.doctor_email) {
    const overlaps = await sql`
      SELECT id FROM appointments
      WHERE clinic_id = ${cId}
        AND doctor_email = ${data.doctor_email}
        AND date = ${data.date}
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND start_time < ${data.end_time}
        AND end_time > ${data.start_time}
      LIMIT 1
    `;
    if (overlaps.length > 0) {
      throw new Error('This time slot overlaps with an existing appointment for this doctor');
    }
  }

  const result = await sql`
    INSERT INTO appointments (
      clinic_id, patient_id, walk_in_name, walk_in_phone,
      doctor_email, doctor_name, date, start_time, end_time,
      visit_type, status, notes
    ) VALUES (
      ${cId}, ${data.patient_id || null}, ${data.walk_in_name || null}, ${data.walk_in_phone || null},
      ${data.doctor_email || null}, ${data.doctor_name || null}, ${data.date}, ${data.start_time}, ${data.end_time},
      ${data.visit_type || 'Consultation'}, 'SCHEDULED', ${data.notes || null}
    ) RETURNING *
  `;

  return result[0] as Appointment;
}

export async function updateAppointment(
  clinicId: string,
  appointmentId: number,
  data: Partial<Appointment>
): Promise<Appointment> {
  const sql = getDb();
  const cId = parseInt(clinicId);

  // Only allow editing if still SCHEDULED or CONFIRMED
  const existing = await sql`
    SELECT status FROM appointments WHERE id = ${appointmentId} AND clinic_id = ${cId}
  `;
  if (existing.length === 0) throw new Error('Appointment not found');
  if (!['SCHEDULED', 'CONFIRMED'].includes(existing[0].status)) {
    throw new Error('Can only edit appointments that are scheduled or confirmed');
  }

  if (data.start_time && data.end_time && data.start_time >= data.end_time) {
    throw new Error('Start time must be before end time');
  }

  // Check for overlaps if time or doctor changed
  const doctorEmail = data.doctor_email ?? existing[0].doctor_email;
  const date = data.date ?? existing[0].date;
  const startTime = data.start_time ?? existing[0].start_time;
  const endTime = data.end_time ?? existing[0].end_time;

  if (doctorEmail) {
    const overlaps = await sql`
      SELECT id FROM appointments
      WHERE clinic_id = ${cId}
        AND doctor_email = ${doctorEmail}
        AND date = ${date}
        AND id != ${appointmentId}
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND start_time < ${endTime}
        AND end_time > ${startTime}
      LIMIT 1
    `;
    if (overlaps.length > 0) {
      throw new Error('This time slot overlaps with an existing appointment for this doctor');
    }
  }

  const result = await sql`
    UPDATE appointments SET
      patient_id = ${data.patient_id ?? null},
      walk_in_name = ${data.walk_in_name ?? null},
      walk_in_phone = ${data.walk_in_phone ?? null},
      doctor_email = ${data.doctor_email ?? null},
      doctor_name = ${data.doctor_name ?? null},
      date = ${date},
      start_time = ${startTime},
      end_time = ${endTime},
      visit_type = ${data.visit_type || 'Consultation'},
      notes = ${data.notes ?? null}
    WHERE id = ${appointmentId} AND clinic_id = ${cId}
    RETURNING *
  `;

  return result[0] as Appointment;
}

export async function updateAppointmentStatus(
  clinicId: string,
  appointmentId: number,
  status: AppointmentStatus
): Promise<Appointment> {
  const sql = getDb();
  const cId = parseInt(clinicId);

  const existing = await sql`
    SELECT * FROM appointments WHERE id = ${appointmentId} AND clinic_id = ${cId}
  `;
  if (existing.length === 0) throw new Error('Appointment not found');

  const appointment = existing[0] as Appointment;

  // Validate status transitions
  const validTransitions: Record<string, AppointmentStatus[]> = {
    SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
    CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  };

  if (!validTransitions[appointment.status]?.includes(status)) {
    throw new Error(`Cannot transition from ${appointment.status} to ${status}`);
  }

  // Auto-create visit when completing an appointment with a linked patient
  let visitId = appointment.visit_id;
  if (status === 'COMPLETED' && appointment.patient_id) {
    const visit = await createVisit(clinicId, {
      patient_id: appointment.patient_id,
      date: appointment.date,
      doctor: appointment.doctor_name,
      doctor_email: appointment.doctor_email,
      visit_type: appointment.visit_type || 'Consultation',
      clinical_findings: '',
      procedure_notes: '',
      tooth_number: '',
      medicine_prescribed: '',
      cost: 0,
      paid: 0,
      billing_items: [],
      dentition_type: 'Adult',
    });
    visitId = visit.id ?? null;
  }

  const result = await sql`
    UPDATE appointments SET status = ${status}, visit_id = ${visitId ?? null}
    WHERE id = ${appointmentId} AND clinic_id = ${cId}
    RETURNING *
  `;

  return result[0] as Appointment;
}

export async function deleteAppointment(clinicId: string, appointmentId: number): Promise<void> {
  const sql = getDb();
  const cId = parseInt(clinicId);

  const existing = await sql`
    SELECT status FROM appointments WHERE id = ${appointmentId} AND clinic_id = ${cId}
  `;
  if (existing.length === 0) throw new Error('Appointment not found');
  if (!['SCHEDULED', 'CONFIRMED'].includes(existing[0].status)) {
    throw new Error('Can only delete appointments that are scheduled or confirmed');
  }

  await sql`DELETE FROM appointments WHERE id = ${appointmentId} AND clinic_id = ${cId}`;
}

export async function getAppointmentDatesInMonth(
  clinicId: string,
  year: number,
  month: number,
  doctorEmail?: string
): Promise<string[]> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const endDate = `${endYear}-${endMonth.toString().padStart(2, '0')}-01`;

  const rows = doctorEmail
    ? await sql`
        SELECT DISTINCT date FROM appointments
        WHERE clinic_id = ${cId} AND date >= ${startDate} AND date < ${endDate}
          AND doctor_email = ${doctorEmail}
          AND status NOT IN ('CANCELLED', 'NO_SHOW')
        ORDER BY date
      `
    : await sql`
        SELECT DISTINCT date FROM appointments
        WHERE clinic_id = ${cId} AND date >= ${startDate} AND date < ${endDate}
          AND status NOT IN ('CANCELLED', 'NO_SHOW')
        ORDER BY date
      `;

  return rows.map((r: { date: string }) => r.date);
}
