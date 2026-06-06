import { getDb } from '@intellident/api';
import { Visit, BillingItem } from '@intellident/api/src/types';

const parseBillingItems = (json?: string | null): BillingItem[] => {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
};

export interface VisitFilters {
  patientId?: string;
  start?: string;
  end?: string;
  visitType?: string;
  doctor?: string;
  search?: string;
}

export async function getVisits(clinicId: string, filters: VisitFilters = {}): Promise<Visit[]> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const { patientId, start, end, visitType, doctor, search } = filters;

  let rows: any[] = patientId
    ? await sql`SELECT v.*, p.name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.clinic_id = ${cId} AND v.patient_id = ${patientId} ORDER BY v.date DESC`
    : await sql`SELECT v.*, p.name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id AND p.clinic_id = v.clinic_id WHERE v.clinic_id = ${cId} ORDER BY v.date DESC`;

  if (start) rows = rows.filter(r => r.date >= start);
  if (end)   rows = rows.filter(r => r.date <= end);

  if (visitType) {
    const q = visitType.toLowerCase();
    rows = rows.filter(r =>
      (r.visit_type || '').toLowerCase().includes(q) ||
      (r.clinical_findings || '').toLowerCase().includes(q) ||
      (r.procedure_notes || '').toLowerCase().includes(q)
    );
  }

  if (doctor) {
    const q = doctor.toLowerCase();
    rows = rows.filter(r => (r.doctor || '').toLowerCase().includes(q) || (r.doctor_email || '').toLowerCase().includes(q));
  }

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r =>
      (r.clinical_findings || '').toLowerCase().includes(q) ||
      (r.procedure_notes || '').toLowerCase().includes(q) ||
      (r.medicine_prescribed || '').toLowerCase().includes(q) ||
      (r.patient_name || '').toLowerCase().includes(q) ||
      (r.tooth_number || '').toLowerCase().includes(q)
    );
  }

  return rows.map((r: any) => ({ ...r, billing_items: parseBillingItems(r.billing_items) })) as Visit[];
}

export async function createVisit(clinicId: string, data: any): Promise<Visit> {
  if (!data.patient_id) throw new Error('patient_id is required');
  if (!data.date) throw new Error('date is required');
  if (!data.clinical_findings?.trim()) throw new Error('clinical_findings is required');
  if (!data.doctor?.trim()) throw new Error('doctor is required');
  if (data.date && new Date(data.date) > new Date()) {
    throw new Error('Visit date cannot be in the future');
  }
  const sql = getDb();
  const cId = parseInt(clinicId);

  // Verify patient belongs to this clinic
  if (data.patient_id) {
    const patient = await sql`SELECT id FROM patients WHERE id = ${data.patient_id} AND clinic_id = ${cId}`;
    if (patient.length === 0) throw new Error('Patient not found in this clinic');
  }
  const billingItemsArray = typeof data.billing_items === 'string' ? parseBillingItems(data.billing_items) : (data.billing_items || []);
  const cost = billingItemsArray.reduce((s: number, i: any) => s + Number(i.amount), 0) || data.cost || 0;
  const result = await sql`
    INSERT INTO visits (clinic_id, patient_id, date, doctor, visit_type, clinical_findings, procedure_notes, tooth_number, medicine_prescribed, cost, paid, xrays, billing_items, dentition_type)
    VALUES (${cId}, ${data.patient_id}, ${data.date}, ${data.doctor}, ${data.visit_type}, ${data.clinical_findings}, ${data.procedure_notes}, ${data.tooth_number}, ${data.medicine_prescribed}, ${cost}, ${data.paid || 0}, ${data.xrays}, ${JSON.stringify(billingItemsArray)}, ${data.dentition_type || 'Adult'})
    RETURNING *
  `;
  return { ...result[0], billing_items: parseBillingItems(result[0].billing_items) } as Visit;
}

export async function updateVisit(clinicId: string, data: Visit): Promise<Visit> {
  if (data.date && new Date(data.date) > new Date()) {
    throw new Error('Visit date cannot be in the future');
  }
  const sql = getDb();
  const cId = parseInt(clinicId);
  const billingItemsArray = typeof data.billing_items === 'string' ? parseBillingItems(data.billing_items) : (data.billing_items || []);
  const cost = billingItemsArray.reduce((s: number, i: any) => s + Number(i.amount), 0) || data.cost || 0;
  const result = await sql`
    UPDATE visits SET date=${data.date}, doctor=${data.doctor}, visit_type=${data.visit_type}, clinical_findings=${data.clinical_findings}, procedure_notes=${data.procedure_notes}, tooth_number=${data.tooth_number}, medicine_prescribed=${data.medicine_prescribed}, cost=${cost}, paid=${data.paid}, xrays=${data.xrays}, billing_items=${JSON.stringify(billingItemsArray)}, dentition_type=${data.dentition_type || 'Adult'}
    WHERE id=${data.id} AND clinic_id=${cId} RETURNING *
  `;
  return { ...result[0], billing_items: parseBillingItems(result[0].billing_items) } as Visit;
}

export async function deleteVisit(clinicId: string, id: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM visits WHERE id=${id} AND clinic_id=${parseInt(clinicId)}`;
}
