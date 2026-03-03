import { getDb } from '@intellident/api';
import { Visit, BillingItem } from '@intellident/api/src/types';

const parseBillingItems = (json?: string | null): BillingItem[] => {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
};

export async function getVisits(clinicId: string, patientId?: string): Promise<Visit[]> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const rows = patientId 
    ? await sql`SELECT *, dentition_type FROM visits WHERE clinic_id = ${cId} AND patient_id = ${patientId} ORDER BY date DESC`
    : await sql`SELECT v.*, p.name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.clinic_id = ${cId} ORDER BY v.date DESC LIMIT 50`;
  return rows.map(r => ({ ...r, billing_items: parseBillingItems(r.billing_items) })) as Visit[];
}

export async function createVisit(clinicId: string, data: any): Promise<Visit> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const cost = data.billing_items?.reduce((s: number, i: any) => s + i.amount, 0) || data.cost || 0;
  const result = await sql`
    INSERT INTO visits (clinic_id, patient_id, date, doctor, visit_type, clinical_findings, procedure_notes, tooth_number, medicine_prescribed, cost, paid, xrays, billing_items, dentition_type)
    VALUES (${cId}, ${data.patient_id}, ${data.date}, ${data.doctor}, ${data.visit_type}, ${data.clinical_findings}, ${data.procedure_notes}, ${data.tooth_number}, ${data.medicine_prescribed}, ${cost}, ${data.paid || 0}, ${data.xrays}, ${JSON.stringify(data.billing_items || [])}, ${data.dentition_type || 'Adult'})
    RETURNING *
  `;
  return { ...result[0], billing_items: parseBillingItems(result[0].billing_items) } as Visit;
}

export async function updateVisit(clinicId: string, data: Visit): Promise<Visit> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const cost = data.billing_items?.reduce((s, i) => s + i.amount, 0) || data.cost || 0;
  const result = await sql`
    UPDATE visits SET date=${data.date}, doctor=${data.doctor}, visit_type=${data.visit_type}, clinical_findings=${data.clinical_findings}, procedure_notes=${data.procedure_notes}, tooth_number=${data.tooth_number}, medicine_prescribed=${data.medicine_prescribed}, cost=${cost}, paid=${data.paid}, xrays=${data.xrays}, billing_items=${JSON.stringify(data.billing_items || [])}, dentition_type=${data.dentition_type || 'Adult'}
    WHERE id=${data.id} AND clinic_id=${cId} RETURNING *
  `;
  return { ...result[0], billing_items: parseBillingItems(result[0].billing_items) } as Visit;
}

export async function deleteVisit(clinicId: string, id: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM visits WHERE id=${id} AND clinic_id=${parseInt(clinicId)}`;
}
