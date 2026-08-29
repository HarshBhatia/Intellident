import { getDb } from '@intellident/api';
import type { Clinic, ClinicInfo, ClinicMember } from '@intellident/api';
import { ApiError } from '@/lib/errors';
import { ASSIGNABLE_ROLES, normalizeRole } from '@/lib/permissions';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

interface ClinicRow {
  name?: string;
  owner_name?: string;
  owner_email?: string;
  phone?: string;
  address?: string;
  email?: string;
  google_maps_link?: string;
  tagline?: string;
  website?: string;
  currency?: string;
  timezone?: string;
  gstin?: string;
  pan?: string;
  gst_rate?: number | string | null;
  state_code?: string;
}

function mapClinicRow(c: ClinicRow): ClinicInfo {
  return {
    clinic_name: c.name || '',
    owner_name: c.owner_name || c.owner_email || '',
    phone: c.phone || '',
    address: c.address || '',
    email: c.email || c.owner_email || '',
    google_maps_link: c.google_maps_link || '',
    tagline: c.tagline || '',
    website: c.website || '',
    currency: c.currency || 'INR',
    timezone: c.timezone || 'Asia/Kolkata',
    gstin: c.gstin || '',
    pan: c.pan || '',
    gst_rate: c.gst_rate != null ? Number(c.gst_rate) : 18,
    state_code: c.state_code || '',
  };
}

let clinicColumnsReady = false;
async function ensureClinicColumns(sql: ReturnType<typeof getDb>) {
  if (clinicColumnsReady) return;
  try {
    await sql`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS owner_name TEXT`;
    await sql`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS patient_counter INTEGER DEFAULT 0`;
  } catch {
    // Column may already exist or the role cannot ALTER; subsequent queries will surface real errors
  }
  clinicColumnsReady = true;
}

function hasOwn<T extends object>(obj: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// ============================================================================
// Clinic Management
// ============================================================================

export async function getClinics(userEmail: string, userId?: string): Promise<Clinic[]> {
  if (!userEmail && !userId) {
    throw new Error('User email is required');
  }
  const sql = getDb();
  const uid = userId || null;
  const email = userEmail || '';
  const clinics = await sql`
    SELECT c.id, c.name, cm.role 
    FROM clinics c
    JOIN clinic_members cm ON c.id = cm.clinic_id
    WHERE cm.status = 'ACTIVE'
      AND (
        (${uid}::text IS NOT NULL AND cm.user_id = ${uid})
        OR LOWER(cm.user_email) = LOWER(${email})
      )
    ORDER BY c.created_at DESC
  `;
  return clinics as Clinic[];
}

export async function createClinic(name: string, userEmail: string, userId?: string): Promise<Clinic> {
  if (!name?.trim()) {
    throw new Error('Clinic name is required');
  }
  if (!userEmail) {
    throw new Error('User email is required');
  }

  const sql = getDb();
  await ensureClinicColumns(sql);

  const clinicName = name.trim();
  const email = normalizeEmail(userEmail);
  const uid = userId || null;

  // Single statement so clinic + owner membership are created atomically
  const newClinic = await sql`
    WITH new_clinic AS (
      INSERT INTO clinics (name, owner_email, owner_id)
      VALUES (${clinicName}, ${email}, ${uid})
      RETURNING id, name
    ), new_member AS (
      INSERT INTO clinic_members (clinic_id, user_email, user_id, role, status)
      SELECT id, ${email}, ${uid}, 'OWNER', 'ACTIVE'
      FROM new_clinic
    )
    SELECT id, name FROM new_clinic
  `;

  return { id: newClinic[0].id, name: newClinic[0].name, role: 'OWNER' };
}

// ============================================================================
// Clinic Info
// ============================================================================

export async function getClinicInfo(clinicId: string): Promise<ClinicInfo | null> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const rows = await sql`SELECT * FROM clinics WHERE id = ${clinicId}`;
  if (rows.length === 0) return null;
  return mapClinicRow(rows[0]);
}

export async function updateClinicInfo(clinicId: string, clinicData: Partial<ClinicInfo>): Promise<ClinicInfo> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  await ensureClinicColumns(sql);

  const result = await sql`
    UPDATE clinics SET
      name = CASE WHEN ${hasOwn(clinicData, 'clinic_name') ? 1 : 0} = 1 THEN ${clinicData.clinic_name ?? null} ELSE name END,
      owner_name = CASE WHEN ${hasOwn(clinicData, 'owner_name') ? 1 : 0} = 1 THEN ${clinicData.owner_name ?? null} ELSE owner_name END,
      phone = CASE WHEN ${hasOwn(clinicData, 'phone') ? 1 : 0} = 1 THEN ${clinicData.phone ?? null} ELSE phone END,
      address = CASE WHEN ${hasOwn(clinicData, 'address') ? 1 : 0} = 1 THEN ${clinicData.address ?? null} ELSE address END,
      google_maps_link = CASE WHEN ${hasOwn(clinicData, 'google_maps_link') ? 1 : 0} = 1 THEN ${clinicData.google_maps_link ?? null} ELSE google_maps_link END,
      tagline = CASE WHEN ${hasOwn(clinicData, 'tagline') ? 1 : 0} = 1 THEN ${clinicData.tagline ?? null} ELSE tagline END,
      website = CASE WHEN ${hasOwn(clinicData, 'website') ? 1 : 0} = 1 THEN ${clinicData.website ?? null} ELSE website END,
      email = CASE WHEN ${hasOwn(clinicData, 'email') ? 1 : 0} = 1 THEN ${clinicData.email ?? null} ELSE email END,
      currency = CASE WHEN ${hasOwn(clinicData, 'currency') ? 1 : 0} = 1 THEN ${clinicData.currency ?? null} ELSE currency END,
      timezone = CASE WHEN ${hasOwn(clinicData, 'timezone') ? 1 : 0} = 1 THEN ${clinicData.timezone ?? null} ELSE timezone END,
      gstin = CASE WHEN ${hasOwn(clinicData, 'gstin') ? 1 : 0} = 1 THEN ${clinicData.gstin ?? null} ELSE gstin END,
      pan = CASE WHEN ${hasOwn(clinicData, 'pan') ? 1 : 0} = 1 THEN ${clinicData.pan ?? null} ELSE pan END,
      gst_rate = CASE WHEN ${hasOwn(clinicData, 'gst_rate') ? 1 : 0} = 1 THEN ${clinicData.gst_rate ?? null} ELSE gst_rate END,
      state_code = CASE WHEN ${hasOwn(clinicData, 'state_code') ? 1 : 0} = 1 THEN ${clinicData.state_code ?? null} ELSE state_code END
    WHERE id = ${clinicId}
    RETURNING *
  `;

  if (result.length === 0) {
    throw new ApiError(404, 'Clinic not found');
  }

  return mapClinicRow(result[0]);
}

export async function incrementInvoiceCounter(clinicId: string): Promise<number> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const result = await sql`
    UPDATE clinics
    SET invoice_counter = invoice_counter + 1
    WHERE id = ${clinicId}
    RETURNING invoice_counter
  `;
  if (result.length === 0) throw new ApiError(404, 'Clinic not found');
  return result[0].invoice_counter as number;
}

export async function allocatePatientId(clinicId: string | number): Promise<string> {
  const sql = getDb();
  const cId = typeof clinicId === 'string' ? parseInt(clinicId) : clinicId;
  await ensureClinicColumns(sql);

  try {
    const result = await sql`
      UPDATE clinics
      SET patient_counter = GREATEST(
        COALESCE(patient_counter, 0),
        (
          SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id FROM 5) AS INTEGER)), 0)
          FROM patients
          WHERE clinic_id = ${cId}
            AND patient_id LIKE 'PID-%'
            AND SUBSTRING(patient_id FROM 5) ~ '^[0-9]+$'
        )
      ) + 1
      WHERE id = ${cId}
      RETURNING patient_counter
    `;
    if (result.length === 0) throw new ApiError(404, 'Clinic not found');
    return `PID-${result[0].patient_counter}`;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Fallback if POSIX regex is unavailable (some PGlite builds)
    const result = await sql`
      UPDATE clinics
      SET patient_counter = COALESCE(patient_counter, 0) + 1
      WHERE id = ${cId}
      RETURNING patient_counter
    `;
    if (result.length === 0) throw new ApiError(404, 'Clinic not found');
    return `PID-${result[0].patient_counter}`;
  }
}

// ============================================================================
// Clinic Members
// ============================================================================

export async function getClinicMembers(clinicId: string): Promise<ClinicMember[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);
  const members = await sql`SELECT id, user_email, user_id, display_name, role, status FROM clinic_members WHERE clinic_id = ${cId}`;
  return members as ClinicMember[];
}

export async function getDoctorMembers(clinicId: string): Promise<ClinicMember[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);
  const doctors = await sql`
    SELECT id, user_email, user_id, display_name, role, status 
    FROM clinic_members 
    WHERE clinic_id = ${cId} 
    AND (role = 'DOCTOR' OR role = 'OWNER')
    AND status = 'ACTIVE'
    ORDER BY display_name, user_email
  `;
  return doctors as ClinicMember[];
}

export async function addClinicMember(clinicId: string, email: string, role: string = 'DOCTOR', displayName?: string): Promise<ClinicMember> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!email) throw new Error('User email is required');

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole || !ASSIGNABLE_ROLES.includes(normalizedRole)) {
    throw new ApiError(400, `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
  }

  const sql = getDb();
  const cId = parseInt(clinicId);
  const normalizedEmail = normalizeEmail(email);

  const existingMember = await sql`
    SELECT id, user_email, user_id, display_name, role, status
    FROM clinic_members
    WHERE clinic_id = ${cId} AND LOWER(user_email) = ${normalizedEmail}
  `;
  if (existingMember.length > 0) {
    return existingMember[0] as ClinicMember;
  }

  const result = await sql`
    INSERT INTO clinic_members (clinic_id, user_email, role, status, display_name)
    VALUES (${cId}, ${normalizedEmail}, ${normalizedRole}, 'ACTIVE', ${displayName || null})
    ON CONFLICT (clinic_id, user_email) DO NOTHING
    RETURNING *
  `;

  if (result.length === 0) {
    const conflict = await sql`
      SELECT id, user_email, user_id, display_name, role, status
      FROM clinic_members
      WHERE clinic_id = ${cId} AND LOWER(user_email) = ${normalizedEmail}
    `;
    return conflict[0] as ClinicMember;
  }

  return result[0] as ClinicMember;
}

export async function updateMemberDisplayName(clinicId: string, memberId: number, displayName: string): Promise<ClinicMember> {
  return updateClinicMember(clinicId, memberId, { displayName });
}

export async function updateClinicMember(
  clinicId: string,
  memberId: number,
  data: { displayName?: string; role?: string }
): Promise<ClinicMember> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const cId = parseInt(clinicId);

  const existing = await sql`
    SELECT id, role, display_name FROM clinic_members WHERE id = ${memberId} AND clinic_id = ${cId}
  `;
  if (existing.length === 0) throw new ApiError(404, 'Member not found');

  let nextRole = existing[0].role as string;
  if (data.role !== undefined) {
    const normalizedRole = normalizeRole(data.role);
    if (!normalizedRole || !ASSIGNABLE_ROLES.includes(normalizedRole)) {
      throw new ApiError(400, `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
    }
    if (normalizeRole(existing[0].role) === 'OWNER') {
      const owners = await sql`
        SELECT COUNT(*)::int AS count
        FROM clinic_members
        WHERE clinic_id = ${cId} AND role = 'OWNER' AND status = 'ACTIVE'
      `;
      if ((owners[0]?.count ?? 0) <= 1) {
        throw new ApiError(400, 'Cannot change the role of the last owner');
      }
    }
    nextRole = normalizedRole;
  }

  const nextName = data.displayName !== undefined ? (data.displayName || null) : existing[0].display_name;
  const result = await sql`
    UPDATE clinic_members
    SET display_name = ${nextName}, role = ${nextRole}
    WHERE id = ${memberId} AND clinic_id = ${cId}
    RETURNING id, user_email, user_id, display_name, role, status
  `;
  return result[0] as ClinicMember;
}

export async function removeClinicMember(clinicId: string, id: string): Promise<void> {
  if (!clinicId) throw new Error('Clinic ID is required');
  if (!id) throw new Error('Member ID is required');

  const sql = getDb();
  const cId = parseInt(clinicId);

  const member = await sql`
    SELECT id, role FROM clinic_members WHERE id = ${id} AND clinic_id = ${cId}
  `;
  if (member.length === 0) {
    throw new ApiError(404, 'Member not found');
  }

  if (normalizeRole(member[0].role) === 'OWNER') {
    const owners = await sql`
      SELECT COUNT(*)::int AS count
      FROM clinic_members
      WHERE clinic_id = ${cId} AND role = 'OWNER' AND status = 'ACTIVE'
    `;
    if ((owners[0]?.count ?? 0) <= 1) {
      throw new ApiError(400, 'Cannot remove the last owner');
    }
  }

  await sql`DELETE FROM clinic_members WHERE id = ${id} AND clinic_id = ${cId}`;
}
