import { getDb } from '@intellident/api';
import { Patient, Visit, BillingItem } from '@intellident/api/src/types'; // Import BillingItem
import { ApiError } from '@/lib/errors';
import { allocatePatientId } from './clinic.service';

const parseBillingItems = (billingItemsJson?: string | null): BillingItem[] => {
  if (!billingItemsJson) return [];
  try {
    const parsed = JSON.parse(billingItemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // Skip invalid billing items
    return [];
  }
};

export interface PatientFilters {
  search?: string;
  gender?: string;
  patientType?: string;
  referralSource?: string;
  minAge?: number;
  maxAge?: number;
  hasBalance?: boolean;
  visitType?: string;
  start?: string;
  end?: string;
}

export async function getPatients(clinicId: string, filters: PatientFilters = {}): Promise<Patient[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);

  let rows: any[] = await sql`
    SELECT
      p.id, p.patient_id, p.name, p.age, p.gender, p.phone_number,
      p.patient_type, p.referral_source, p.created_at, p.clinic_id,
      MAX(v.date) as last_visit,
      COUNT(v.id) as visit_count,
      COALESCE(SUM(v.cost), 0) - COALESCE(SUM(v.paid), 0) as balance,
      COALESCE(SUM(v.paid), 0) as lifetime_value,
      (SELECT a.date FROM appointments a WHERE a.patient_id = p.id AND a.clinic_id = ${cId} AND a.status IN ('SCHEDULED', 'CONFIRMED') AND a.date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') ORDER BY a.date ASC, a.start_time ASC LIMIT 1) as next_visit
    FROM patients p
    LEFT JOIN visits v ON v.patient_id = p.id AND v.clinic_id = ${cId}
    WHERE p.clinic_id = ${cId} AND p.is_active = TRUE
    GROUP BY p.id, p.patient_id, p.name, p.age, p.gender, p.phone_number, p.patient_type, p.referral_source, p.created_at, p.clinic_id
    ORDER BY last_visit DESC NULLS LAST, p.created_at DESC
  `;

  const { search, gender, patientType, referralSource, minAge, maxAge, hasBalance, visitType, start, end } = filters;

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.phone_number || '').toLowerCase().includes(q) ||
      (r.patient_id || '').toLowerCase().includes(q)
    );
  }
  if (gender)         rows = rows.filter(r => (r.gender || '').toLowerCase() === gender.toLowerCase());
  if (patientType)    rows = rows.filter(r => (r.patient_type || '').toLowerCase().includes(patientType.toLowerCase()));
  if (referralSource) rows = rows.filter(r => (r.referral_source || '').toLowerCase().includes(referralSource.toLowerCase()));
  if (minAge !== undefined) rows = rows.filter(r => r.age != null && r.age >= minAge);
  if (maxAge !== undefined) rows = rows.filter(r => r.age != null && r.age <= maxAge);
  if (hasBalance)     rows = rows.filter(r => Number(r.balance) > 0);

  // Filter patients who had a specific visit type (or visited in a date range)
  if (visitType || start || end) {
    const patientIds = new Set(rows.map(r => r.id));
    const visitRows: any[] = await sql`
      SELECT DISTINCT patient_id, date, visit_type, clinical_findings, procedure_notes
      FROM visits
      WHERE clinic_id = ${cId} AND patient_id = ANY(${[...patientIds]})
    `;
    const matchingIds = new Set<number>();
    for (const v of visitRows) {
      const typeMatch = !visitType || (
        (v.visit_type || '').toLowerCase().includes(visitType.toLowerCase()) ||
        (v.clinical_findings || '').toLowerCase().includes(visitType.toLowerCase()) ||
        (v.procedure_notes || '').toLowerCase().includes(visitType.toLowerCase())
      );
      const startMatch = !start || v.date >= start;
      const endMatch   = !end   || v.date <= end;
      if (typeMatch && startMatch && endMatch) matchingIds.add(v.patient_id);
    }
    rows = rows.filter(r => matchingIds.has(r.id));
  }

  return rows as Patient[];
}

export async function getPatientByIdWithVisits(clinicId: string, patientId: string): Promise<any | null> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientId) throw new Error('Patient ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const patientRows = await sql`SELECT id, patient_id, name, age, gender, phone_number, patient_type, referral_source, created_at, clinic_id FROM patients WHERE patient_id = ${patientId} AND clinic_id = ${cId} AND is_active = TRUE`;
  
  if (patientRows.length === 0) return null;
  
  const patient = patientRows[0] as Patient;
  
  const visitsPromise = sql`
    SELECT id, clinic_id, patient_id, date, doctor, visit_type, clinical_findings, procedure_notes, tooth_number, medicine_prescribed, cost, paid, xrays, billing_items, created_at, dentition_type
    FROM visits 
    WHERE patient_id = ${patient.id} 
    AND clinic_id = ${cId}
    ORDER BY date DESC, created_at DESC
  `;

  const doctorsPromise = sql`
    SELECT id, user_email, display_name as name, role 
    FROM clinic_members 
    WHERE clinic_id = ${cId} 
    AND (role = 'DOCTOR' OR role = 'OWNER')
    AND status = 'ACTIVE'
  `;

  const [visits, doctors] = await Promise.all([visitsPromise, doctorsPromise]);
  
  return { 
    ...patient, 
    visits: visits.map((row: any) => ({
      ...row,
      billing_items: parseBillingItems(row.billing_items)
    })) as Visit[],
    doctors: doctors as { id: number, name: string }[]
  };
}


function isUniqueViolation(err: any): boolean {
  const msg = String(err?.message || err || '');
  return err?.code === '23505' || /duplicate key|unique constraint|unique violation/i.test(msg);
}

function hasOwn<T extends object>(obj: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export async function createPatient(clinicId: string, patientData: Omit<Patient, 'id' | 'patient_id' | 'created_at' | 'clinic_id'>): Promise<Patient> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientData.name) throw new Error('Patient name is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const { name, age, gender, phone_number, patient_type, referral_source } = patientData;

  const maxAttempts = 3;
  let lastError: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nextId = await allocatePatientId(cId);
    try {
      const result = await sql`
        INSERT INTO patients (
          patient_id, name, age, gender, phone_number, patient_type, clinic_id, referral_source
        ) VALUES (
          ${nextId}, ${name}, ${age}, ${gender}, ${phone_number}, ${patient_type}, ${cId}, ${referral_source ?? null}
        )
        RETURNING *
      `;
      return result[0] as Patient;
    } catch (err) {
      lastError = err;
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw lastError;
}

export async function updatePatient(clinicId: string, patientId: string, patientData: Partial<Omit<Patient, 'id' | 'patient_id' | 'created_at' | 'clinic_id'>>): Promise<Patient> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientId) throw new Error('Patient ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);

  const result = await sql`
    UPDATE patients SET
      name = CASE WHEN ${hasOwn(patientData, 'name') ? 1 : 0} = 1 THEN ${patientData.name ?? null} ELSE name END,
      age = CASE WHEN ${hasOwn(patientData, 'age') ? 1 : 0} = 1 THEN ${patientData.age ?? null} ELSE age END,
      gender = CASE WHEN ${hasOwn(patientData, 'gender') ? 1 : 0} = 1 THEN ${patientData.gender ?? null} ELSE gender END,
      phone_number = CASE WHEN ${hasOwn(patientData, 'phone_number') ? 1 : 0} = 1 THEN ${patientData.phone_number ?? null} ELSE phone_number END,
      patient_type = CASE WHEN ${hasOwn(patientData, 'patient_type') ? 1 : 0} = 1 THEN ${patientData.patient_type ?? null} ELSE patient_type END,
      referral_source = CASE WHEN ${hasOwn(patientData, 'referral_source') ? 1 : 0} = 1 THEN ${patientData.referral_source ?? null} ELSE referral_source END
    WHERE patient_id = ${patientId} AND clinic_id = ${cId} AND is_active = TRUE
    RETURNING *
  `;

  if (result.length === 0) {
    throw new ApiError(404, 'Patient not found');
  }

  return result[0] as Patient;
}

export async function deletePatient(clinicId: string, patientId: string): Promise<void> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientId) throw new Error('Patient ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const result = await sql`DELETE FROM patients WHERE patient_id = ${patientId} AND clinic_id = ${cId} RETURNING id`;
  if (result.length === 0) {
    throw new ApiError(404, 'Patient not found');
  }
}

export async function softDeletePatient(clinicId: string, patientId: string): Promise<void> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientId) throw new Error('Patient ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const result = await sql`
    UPDATE patients 
    SET is_active = FALSE 
    WHERE patient_id = ${patientId} AND clinic_id = ${cId} AND is_active = TRUE
    RETURNING id
  `;
  if (result.length === 0) {
    throw new ApiError(404, 'Patient not found');
  }
}