import { getDb } from '@intellident/api';
import { Patient, Visit, BillingItem } from '@intellident/api/src/types'; // Import BillingItem

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

export async function getPatients(clinicId: string): Promise<Patient[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);
  
  // Optimized: Use LEFT JOIN with GROUP BY instead of correlated subquery
  const rows = await sql`
    SELECT 
      p.id, 
      p.patient_id, 
      p.name, 
      p.age, 
      p.gender, 
      p.phone_number, 
      p.patient_type, 
      p.created_at, 
      p.clinic_id,
      MAX(v.date) as last_visit
    FROM patients p
    LEFT JOIN visits v ON v.patient_id = p.id AND v.clinic_id = ${cId}
    WHERE p.clinic_id = ${cId} AND p.is_active = TRUE
    GROUP BY p.id, p.patient_id, p.name, p.age, p.gender, p.phone_number, p.patient_type, p.created_at, p.clinic_id
    ORDER BY p.created_at DESC
  `;
  return rows as Patient[];
}

export async function getPatientByIdWithVisits(clinicId: string, patientId: string): Promise<any | null> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientId) throw new Error('Patient ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const patientRows = await sql`SELECT id, patient_id, name, age, gender, phone_number, patient_type, created_at, clinic_id FROM patients WHERE patient_id = ${patientId} AND clinic_id = ${cId} AND is_active = TRUE`;
  
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
    SELECT id, user_email, display_name, role 
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


export async function createPatient(clinicId: string, patientData: Omit<Patient, 'id' | 'patient_id' | 'created_at' | 'clinic_id'>): Promise<Patient> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientData.name) throw new Error('Patient name is required');

  const sql = getDb();
  const cId = parseInt(clinicId);

  // Auto-generate next Patient ID in PID-XX format for this clinic
  let nextId = 'PID-1';
  try {
    const allIds = await sql`
      SELECT patient_id FROM patients 
      WHERE clinic_id = ${cId} 
      AND patient_id LIKE 'PID-%'
    `;
    
    let maxNum = 0;
    allIds.forEach((row: any) => {
      const match = row.patient_id.match(/^PID-(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });
    
    nextId = `PID-${maxNum + 1}`;
  } catch (e) {
    const countResult = await sql`SELECT COUNT(*) FROM patients WHERE clinic_id = ${cId}`;
    nextId = `PID-${parseInt(countResult[0].count) + 1}`;
  }

  const { name, age, gender, phone_number, patient_type, referral_source } = patientData;

  const result = await sql`
    INSERT INTO patients (
      patient_id, name, age, gender, phone_number, patient_type, clinic_id, referral_source
    ) VALUES (
      ${nextId}, ${name}, ${age}, ${gender}, ${phone_number}, ${patient_type}, ${cId}, ${referral_source ?? null}
    )
    RETURNING *
  `;
  return result[0] as Patient;
}

export async function updatePatient(clinicId: string, patientId: string, patientData: Partial<Omit<Patient, 'id' | 'patient_id' | 'created_at' | 'clinic_id'>>): Promise<Patient> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!patientId) throw new Error('Patient ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);
  const { name, age, gender, phone_number, patient_type, referral_source } = patientData;

  const result = await sql`
    UPDATE patients SET
      name = ${name},
      age = ${age},
      gender = ${gender},
      phone_number = ${phone_number},
      patient_type = ${patient_type},
      referral_source = ${referral_source ?? null}
    WHERE patient_id = ${patientId} AND clinic_id = ${cId}
    RETURNING *
  `;

  if (result.length === 0) {
    throw new Error('Patient not found');
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
    throw new Error('Patient not found');
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
    WHERE patient_id = ${patientId} AND clinic_id = ${cId} 
    RETURNING id
  `;
  if (result.length === 0) {
    throw new Error('Patient not found');
  }
}