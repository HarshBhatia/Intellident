import { getDb } from '@intellident/api';
import { Visit, BillingItem } from '@intellident/api/src/types';

const parseBillingItems = (billingItemsJson?: string | null): BillingItem[] => {
  if (!billingItemsJson) return [];
  try {
    const parsed = JSON.parse(billingItemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error parsing billing_items JSON:', e);
    return [];
  }
};

const serializeBillingItems = (billingItems?: BillingItem[]): string | undefined => {
  if (!billingItems || billingItems.length === 0) return undefined;
  return JSON.stringify(billingItems);
};

const calculateTotalCost = (billingItems?: BillingItem[]): number => {
  return billingItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
};

export async function getVisits(clinicId: string, patientId?: string): Promise<Visit[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);
  
  let rows: any[];
  if (patientId) {
    rows = await sql`
      SELECT id, clinic_id, patient_id, date, doctor, visit_type, clinical_findings, procedure_notes, tooth_number, medicine_prescribed, cost, paid, xrays, billing_items, created_at
      FROM visits 
      WHERE clinic_id = ${cId} AND patient_id = ${patientId}
      ORDER BY date DESC, created_at DESC
    `;
  } else {
    rows = await sql`
      SELECT v.id, v.clinic_id, v.patient_id, v.date, v.doctor, v.visit_type, v.clinical_findings, v.procedure_notes, v.tooth_number, v.medicine_prescribed, v.cost, v.paid, v.xrays, v.billing_items, v.created_at, p.name as patient_name, p.patient_id as patient_readable_id
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE v.clinic_id = ${cId}
      ORDER BY v.date DESC, v.created_at DESC
      LIMIT 50
    `;
  }

  return rows.map(row => ({
    ...row,
    billing_items: parseBillingItems(row.billing_items)
  })) as Visit[];
}

export async function createVisit(clinicId: string, visitData: Omit<Visit, 'id' | 'created_at' | 'clinic_id' | 'cost'> & { patient_id: number, cost?: number }): Promise<Visit> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!visitData.patient_id) throw new Error('Patient ID is required');
  if (!visitData.date) throw new Error('Visit date is required');

  if (new Date(visitData.date) > new Date()) {
    throw new Error('Visit date cannot be in the future');
  }

  const sql = getDb();
  const cId = parseInt(clinicId);
  
  // Verify patient belongs to clinic
  const patientCheck = await sql`SELECT id FROM patients WHERE id = ${visitData.patient_id} AND clinic_id = ${cId}`;
  if (patientCheck.length === 0) {
    throw new Error('Patient not found');
  }

  const { 
    patient_id, date, doctor, visit_type, clinical_findings, procedure_notes, tooth_number, 
    medicine_prescribed, paid, xrays, billing_items
  } = visitData;

  const totalCost = calculateTotalCost(billing_items);
  const serializedBillingItems = serializeBillingItems(billing_items);

  const result = await sql`
    INSERT INTO visits (
      clinic_id, patient_id, date, doctor, visit_type,
      clinical_findings, procedure_notes, 
      tooth_number, medicine_prescribed, cost, paid, 
      xrays, billing_items
    ) VALUES (
      ${cId}, ${patient_id}, ${date}, ${doctor}, ${visit_type || 'Consultation'},
      ${clinical_findings}, ${procedure_notes}, 
      ${tooth_number}, ${medicine_prescribed}, ${totalCost}, ${paid || 0},
      ${xrays}, ${serializedBillingItems}
    )
    RETURNING *
  `;

  const newVisit = result[0];
  return {
    ...newVisit,
    billing_items: parseBillingItems(newVisit.billing_items)
  } as Visit;
}

export async function deleteVisit(clinicId: string, id: string): Promise<void> {
  if (!id) throw new Error('Visit ID is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const result = await sql`DELETE FROM visits WHERE id = ${id} AND clinic_id = ${cId} RETURNING id`;
  if (result.length === 0) {
    throw new Error('Visit not found');
  }
}

export async function updateVisit(clinicId: string, visitData: Visit): Promise<Visit> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!visitData.id) throw new Error('Visit ID is required');

  if (visitData.date && new Date(visitData.date) > new Date()) {
    throw new Error('Visit date cannot be in the future');
  }

  const sql = getDb();
  const cId = parseInt(clinicId);

  const { 
    id, date, doctor, visit_type, clinical_findings, procedure_notes, tooth_number, 
    medicine_prescribed, paid, xrays, billing_items
  } = visitData;

  const totalCost = calculateTotalCost(billing_items);
  const serializedBillingItems = serializeBillingItems(billing_items);

  const result = await sql`
    UPDATE visits SET
      date = ${date},
      doctor = ${doctor},
      visit_type = ${visit_type},
      clinical_findings = ${clinical_findings},
      procedure_notes = ${procedure_notes},
      tooth_number = ${tooth_number},
      medicine_prescribed = ${medicine_prescribed},
      cost = ${totalCost},
      paid = ${paid},
      xrays = ${xrays},
      billing_items = ${serializedBillingItems}
    WHERE id = ${id} AND clinic_id = ${cId}
    RETURNING *
  `;

  if (result.length === 0) {
    throw new Error('Visit not found');
  }

  const updatedVisit = result[0];
  return {
    ...updatedVisit,
    billing_items: parseBillingItems(updatedVisit.billing_items)
  } as Visit;
}