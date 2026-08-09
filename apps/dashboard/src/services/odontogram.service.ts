import { getDb } from '@intellident/api';
import { ApiError } from '@/lib/errors';

export const ODONTOGRAM_CONDITIONS = [
  'caries', 'filled', 'crown', 'rct', 'missing',
  'extraction', 'implant', 'bridge', 'mobility', 'fractured', 'sensitive',
] as const;

export const ODONTOGRAM_SURFACES = ['occlusal', 'mesial', 'distal', 'buccal', 'lingual'] as const;

const FDI_TEETH = new Set([
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
]);

const CONDITIONS = new Set<string>(ODONTOGRAM_CONDITIONS);
const SURFACES = new Set<string>(ODONTOGRAM_SURFACES);
const MAX_CHART_BYTES = 100_000;

export type OdontogramChart = Record<string, {
  surfaces?: Record<string, string>;
  whole?: string;
  notes?: string;
}>;

export function validateOdontogramChart(input: unknown): OdontogramChart {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Chart must be an object');
  }
  const raw = JSON.stringify(input);
  if (raw.length > MAX_CHART_BYTES) {
    throw new ApiError(400, 'Chart is too large');
  }

  const chart: OdontogramChart = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const tooth = Number(key);
    if (!FDI_TEETH.has(tooth)) {
      throw new ApiError(400, `Invalid tooth number: ${key}`);
    }
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      throw new ApiError(400, `Invalid state for tooth ${key}`);
    }
    const state = value as Record<string, unknown>;
    const next: OdontogramChart[string] = {};

    if (state.whole != null) {
      if (typeof state.whole !== 'string' || !CONDITIONS.has(state.whole)) {
        throw new ApiError(400, `Invalid whole condition on tooth ${key}`);
      }
      next.whole = state.whole;
    }

    if (state.notes != null) {
      if (typeof state.notes !== 'string' || state.notes.length > 2000) {
        throw new ApiError(400, `Invalid notes on tooth ${key}`);
      }
      if (state.notes.trim()) next.notes = state.notes;
    }

    if (state.surfaces != null) {
      if (typeof state.surfaces !== 'object' || Array.isArray(state.surfaces)) {
        throw new ApiError(400, `Invalid surfaces on tooth ${key}`);
      }
      const surfaces: Record<string, string> = {};
      for (const [surf, cond] of Object.entries(state.surfaces as Record<string, unknown>)) {
        if (!SURFACES.has(surf) || typeof cond !== 'string' || !CONDITIONS.has(cond)) {
          throw new ApiError(400, `Invalid surface marking on tooth ${key}`);
        }
        surfaces[surf] = cond;
      }
      if (Object.keys(surfaces).length) next.surfaces = surfaces;
    }

    if (next.whole || next.notes || next.surfaces) {
      chart[String(tooth)] = next;
    }
  }
  return chart;
}

function parseChart(raw: unknown): OdontogramChart {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (typeof raw === 'object') return raw as OdontogramChart;
  return {};
}

async function resolveInternalPatientId(clinicId: string, patientCode: string): Promise<number> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const rows = await sql`
    SELECT id FROM patients
    WHERE patient_id = ${patientCode} AND clinic_id = ${cId} AND is_active = TRUE
  `;
  if (rows.length === 0) throw new ApiError(404, 'Patient not found');
  return rows[0].id as number;
}

export async function getOdontogram(clinicId: string, patientCode: string): Promise<{
  chart: OdontogramChart;
  updated_at: string | null;
  updated_by: string | null;
}> {
  const sql = getDb();
  const cId = parseInt(clinicId);
  const patientId = await resolveInternalPatientId(clinicId, patientCode);
  const rows = await sql`
    SELECT chart, updated_at, updated_by
    FROM patient_odontograms
    WHERE clinic_id = ${cId} AND patient_id = ${patientId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    return { chart: {}, updated_at: null, updated_by: null };
  }
  return {
    chart: parseChart(rows[0].chart),
    updated_at: rows[0].updated_at ? String(rows[0].updated_at) : null,
    updated_by: rows[0].updated_by || null,
  };
}

export async function saveOdontogram(
  clinicId: string,
  patientCode: string,
  chartInput: unknown,
  updatedBy: string
): Promise<{ chart: OdontogramChart; updated_at: string | null; updated_by: string | null }> {
  const chart = validateOdontogramChart(chartInput);
  const sql = getDb();
  const cId = parseInt(clinicId);
  const patientId = await resolveInternalPatientId(clinicId, patientCode);
  const payload = JSON.stringify(chart);
  const rows = await sql`
    INSERT INTO patient_odontograms (clinic_id, patient_id, chart, updated_by, updated_at)
    VALUES (${cId}, ${patientId}, ${payload}, ${updatedBy}, CURRENT_TIMESTAMP)
    ON CONFLICT (clinic_id, patient_id)
    DO UPDATE SET chart = EXCLUDED.chart, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
    RETURNING chart, updated_at, updated_by
  `;
  return {
    chart: parseChart(rows[0].chart),
    updated_at: rows[0].updated_at ? String(rows[0].updated_at) : null,
    updated_by: rows[0].updated_by || null,
  };
}
