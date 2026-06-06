import { getDb } from '@intellident/api';
import type { Patient, Visit } from '@intellident/api';

export interface SearchResult {
  patients: PatientSearchResult[];
  visits: VisitSearchResult[];
}

export interface PatientSearchResult {
  id: number;
  patient_id: string;
  name: string;
  phone_number: string | null;
  age: number | null;
  gender: string | null;
  patient_type: string | null;
  last_visit: string | null;
  visit_count: number;
  balance: number;
}

export interface VisitSearchResult {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_code: string;
  date: string;
  doctor: string | null;
  visit_type: string | null;
  clinical_findings: string | null;
  procedure_notes: string | null;
  medicine_prescribed: string | null;
  tooth_number: string | null;
  cost: number;
  paid: number;
}

const MAX_RESULTS = 25;

export async function search(query: string, clinicId: string): Promise<SearchResult> {
  if (!query || !clinicId) return { patients: [], visits: [] };

  const sql = getDb();
  const pattern = `%${query}%`;

  const [patients, visits] = await Promise.all([
    searchPatients(sql, pattern, clinicId),
    searchVisits(sql, pattern, clinicId),
  ]);

  return { patients, visits };
}

async function searchPatients(sql: ReturnType<typeof getDb>, pattern: string, clinicId: string): Promise<PatientSearchResult[]> {
  const rows = await sql`
    SELECT
      p.id, p.patient_id, p.name, p.phone_number, p.age, p.gender, p.patient_type,
      MAX(v.date) AS last_visit,
      COUNT(v.id)::int AS visit_count,
      COALESCE(SUM(v.cost), 0) - COALESCE(SUM(v.paid), 0) AS balance
    FROM patients p
    LEFT JOIN visits v ON v.patient_id = p.id AND v.clinic_id = p.clinic_id
    WHERE p.clinic_id = ${clinicId}
      AND p.is_active = TRUE
      AND (
        p.name ILIKE ${pattern}
        OR p.phone_number ILIKE ${pattern}
        OR p.patient_id ILIKE ${pattern}
      )
    GROUP BY p.id
    ORDER BY p.name
    LIMIT ${MAX_RESULTS}
  `;
  return rows as PatientSearchResult[];
}

async function searchVisits(sql: ReturnType<typeof getDb>, pattern: string, clinicId: string): Promise<VisitSearchResult[]> {
  const rows = await sql`
    SELECT
      v.id, v.patient_id, p.name AS patient_name, p.patient_id AS patient_code,
      v.date, v.doctor, v.visit_type,
      v.clinical_findings, v.procedure_notes, v.medicine_prescribed,
      v.tooth_number, COALESCE(v.cost, 0) AS cost, COALESCE(v.paid, 0) AS paid
    FROM visits v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.clinic_id = ${clinicId}
      AND (
        v.clinical_findings ILIKE ${pattern}
        OR v.procedure_notes ILIKE ${pattern}
        OR v.medicine_prescribed ILIKE ${pattern}
        OR v.tooth_number ILIKE ${pattern}
        OR v.visit_type ILIKE ${pattern}
        OR p.name ILIKE ${pattern}
      )
    ORDER BY v.date DESC
    LIMIT ${MAX_RESULTS}
  `;
  return rows as VisitSearchResult[];
}