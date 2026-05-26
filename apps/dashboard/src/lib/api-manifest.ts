/**
 * API Manifest — single source of truth for all dashboard API endpoints.
 *
 * The AI chat route reads this at runtime to build its system prompt.
 * When you add or change an API route, update this file and the chatbot
 * learns the new capability automatically.
 */

export interface EndpointParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export interface Endpoint {
  method: string;
  path: string;
  description: string;
  queryParams?: EndpointParam[];
  bodyFields?: EndpointParam[];
  responseHint?: string;
  permission?: string;
}

export const apiManifest: Endpoint[] = [
  // ── Patients ──────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/patients',
    description:
      'List all active patients with computed fields: last_visit, visit_count, balance (outstanding), lifetime_value (total paid), and next upcoming appointment date.',
    responseHint:
      'Array of { patient_id, name, age, gender, phone_number, patient_type, last_visit, visit_count, balance, lifetime_value, next_visit }',
  },
  {
    method: 'POST',
    path: '/api/patients',
    description: 'Create a new patient. patient_id (PID-N) is auto-generated.',
    bodyFields: [
      { name: 'name', type: 'string', required: true, description: 'Patient full name' },
      { name: 'age', type: 'number', description: 'Age in years' },
      { name: 'gender', type: 'string', description: 'Male / Female / Other' },
      { name: 'phone_number', type: 'string', description: 'Phone number' },
      { name: 'patient_type', type: 'string', description: 'e.g. Regular, Insurance' },
      { name: 'referral_source', type: 'string', description: 'How they found the clinic' },
    ],
  },
  {
    method: 'GET',
    path: '/api/patients/{patient_id}',
    description:
      'Get full patient record plus their visit history and list of doctors. Use the patient_id string (e.g. PID-1).',
    responseHint:
      'Patient object with visits[] (date, doctor, visit_type, clinical_findings, procedure_notes, tooth_number, medicine_prescribed, cost, paid, billing_items) and doctors[]',
  },
  {
    method: 'PUT',
    path: '/api/patients/{patient_id}',
    description: 'Update patient info. Use the patient_id string (e.g. PID-1) in the URL.',
    bodyFields: [
      { name: 'name', type: 'string', description: 'Patient full name' },
      { name: 'age', type: 'number', description: 'Age in years' },
      { name: 'gender', type: 'string', description: 'Male / Female / Other' },
      { name: 'phone_number', type: 'string', description: 'Phone number' },
      { name: 'patient_type', type: 'string', description: 'e.g. Regular, Insurance' },
      { name: 'referral_source', type: 'string', description: 'How they found the clinic' },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/patients/{patient_id}',
    description:
      'Soft-delete a patient (sets is_active=false). Add ?hard=true for permanent deletion.',
    queryParams: [
      { name: 'hard', type: 'boolean', description: 'If true, permanently deletes the patient' },
    ],
    permission: 'patients.delete (OWNER/ADMIN only)',
  },

  // ── Visits ────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/visits',
    description:
      'Get visits. Without patientId returns the 50 most recent visits across all patients (includes patient_name). With patientId returns all visits for that patient.',
    queryParams: [
      {
        name: 'patientId',
        type: 'number',
        description: 'Internal numeric patient id (not PID-X). Omit for recent visits across all patients.',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/visits',
    description: 'Create a new visit. Cost is auto-computed from billing_items if provided.',
    bodyFields: [
      { name: 'patient_id', type: 'number', required: true, description: 'Internal numeric patient id' },
      { name: 'date', type: 'string', required: true, description: 'Visit date YYYY-MM-DD (cannot be future)' },
      { name: 'doctor', type: 'string', description: 'Doctor name' },
      { name: 'visit_type', type: 'string', description: 'e.g. Consultation, Follow-up, Procedure' },
      { name: 'clinical_findings', type: 'string', description: 'Clinical findings text' },
      { name: 'procedure_notes', type: 'string', description: 'Procedure notes text' },
      { name: 'tooth_number', type: 'string', description: 'Tooth numbers (1-8 adult, A-E child)' },
      { name: 'medicine_prescribed', type: 'string', description: 'Medicines prescribed' },
      { name: 'paid', type: 'number', description: 'Amount paid' },
      { name: 'billing_items', type: 'array', description: 'Array of { description, amount }' },
      { name: 'dentition_type', type: 'string', description: 'Adult or Child' },
    ],
  },
  {
    method: 'PUT',
    path: '/api/visits',
    description: 'Update an existing visit. Include the visit id in the body.',
    bodyFields: [
      { name: 'id', type: 'number', required: true, description: 'Visit id to update' },
    ],
    permission: 'clinical_notes.edit (DOCTOR/ADMIN/OWNER)',
  },
  {
    method: 'DELETE',
    path: '/api/visits',
    description: 'Delete a visit by id.',
    queryParams: [
      { name: 'id', type: 'string', required: true, description: 'Visit id to delete' },
    ],
    permission: 'visits.delete (DOCTOR/ADMIN/OWNER)',
  },

  // ── Appointments ──────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/appointments',
    description:
      'Get appointments for a specific date. Includes patient_name via join.',
    queryParams: [
      { name: 'date', type: 'string', required: true, description: 'Date in YYYY-MM-DD format' },
      { name: 'doctor', type: 'string', description: 'Doctor email to filter by' },
    ],
    responseHint:
      'Array of { id, patient_name, walk_in_name, doctor_name, date, start_time, end_time, visit_type, status, notes }',
  },
  {
    method: 'POST',
    path: '/api/appointments',
    description: 'Create a new appointment. Status auto-set to SCHEDULED.',
    bodyFields: [
      { name: 'date', type: 'string', required: true, description: 'Date YYYY-MM-DD' },
      { name: 'start_time', type: 'string', required: true, description: 'Start time HH:MM' },
      { name: 'end_time', type: 'string', required: true, description: 'End time HH:MM' },
      { name: 'patient_id', type: 'number', description: 'Link to existing patient (internal id)' },
      { name: 'walk_in_name', type: 'string', description: 'Name for walk-in (no patient record)' },
      { name: 'walk_in_phone', type: 'string', description: 'Phone for walk-in' },
      { name: 'doctor_email', type: 'string', description: 'Doctor email' },
      { name: 'doctor_name', type: 'string', description: 'Doctor display name' },
      { name: 'visit_type', type: 'string', description: 'e.g. Consultation, RCT' },
      { name: 'notes', type: 'string', description: 'Appointment notes' },
    ],
  },
  {
    method: 'PUT',
    path: '/api/appointments',
    description:
      'Update an appointment. Only SCHEDULED or CONFIRMED appointments can be edited.',
    bodyFields: [
      { name: 'id', type: 'number', required: true, description: 'Appointment id' },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/appointments',
    description:
      'Delete an appointment. Only SCHEDULED or CONFIRMED appointments can be deleted.',
    queryParams: [
      { name: 'id', type: 'string', required: true, description: 'Appointment id' },
    ],
  },
  {
    method: 'GET',
    path: '/api/appointments/dates',
    description:
      'Get dates that have appointments in a given month. Useful for calendar dot indicators.',
    queryParams: [
      { name: 'year', type: 'number', required: true, description: 'Year (e.g. 2025)' },
      { name: 'month', type: 'number', required: true, description: 'Month 1-12' },
      { name: 'doctor', type: 'string', description: 'Doctor email filter' },
    ],
    responseHint: 'Array of date strings, e.g. ["2025-05-01", "2025-05-14"]',
  },
  {
    method: 'PUT',
    path: '/api/appointments/status',
    description:
      'Update appointment status. Valid transitions: SCHEDULED→CONFIRMED/CANCELLED/NO_SHOW, CONFIRMED→IN_PROGRESS/CANCELLED/NO_SHOW, IN_PROGRESS→COMPLETED/CANCELLED. Completing auto-creates a Visit if patient is linked.',
    bodyFields: [
      { name: 'id', type: 'number', required: true, description: 'Appointment id' },
      { name: 'status', type: 'string', required: true, description: 'New status' },
    ],
  },

  // ── Expenses ──────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/expenses',
    description: 'Get all expenses ordered by date descending.',
    responseHint: 'Array of { id, date, amount, category, description }',
  },
  {
    method: 'POST',
    path: '/api/expenses',
    description: 'Create a new expense.',
    bodyFields: [
      { name: 'date', type: 'string', required: true, description: 'Date YYYY-MM-DD' },
      { name: 'amount', type: 'number', required: true, description: 'Amount' },
      { name: 'category', type: 'string', required: true, description: 'Expense category' },
      { name: 'description', type: 'string', description: 'Description' },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/expenses',
    description: 'Delete an expense.',
    bodyFields: [
      { name: 'id', type: 'number', required: true, description: 'Expense id' },
    ],
    permission: 'OWNER only',
  },

  // ── Expense Categories ────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/expenses/categories',
    description: 'Get all expense categories for the clinic.',
    responseHint: 'Array of { id, name }',
  },
  {
    method: 'POST',
    path: '/api/expenses/categories',
    description: 'Create an expense category (upserts — returns existing if name already exists).',
    bodyFields: [
      { name: 'name', type: 'string', required: true, description: 'Category name' },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/expenses/categories',
    description: 'Delete an expense category.',
    bodyFields: [
      { name: 'id', type: 'number', required: true, description: 'Category id' },
    ],
  },

  // ── Clinic ────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/clinic',
    description:
      'Get clinic info. Use ?id=current for the current clinic details (name, address, phone, currency, GST fields). Without ?id, lists all clinics the user belongs to.',
    queryParams: [
      { name: 'id', type: 'string', description: 'Pass "current" to get current clinic info, or omit to list all clinics' },
    ],
    responseHint:
      'With id: { clinic_name, owner_name, phone, address, email, currency, timezone, gstin, pan, gst_rate, state_code, ... }. Without id: Array of { id, name, role }',
  },
  {
    method: 'POST',
    path: '/api/clinic',
    description:
      'Create a new clinic (body has name only) or update current clinic settings (body includes id/clinicId plus fields to update).',
    bodyFields: [
      { name: 'name', type: 'string', description: 'Clinic name (for creation)' },
      { name: 'clinic_name', type: 'string', description: 'Clinic display name (for update)' },
      { name: 'phone', type: 'string', description: 'Clinic phone' },
      { name: 'address', type: 'string', description: 'Clinic address' },
      { name: 'email', type: 'string', description: 'Clinic email' },
      { name: 'currency', type: 'string', description: 'Currency symbol, e.g. ₹' },
      { name: 'timezone', type: 'string', description: 'Timezone, e.g. Asia/Kolkata' },
    ],
  },

  // ── Clinic Members ────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/clinic/members',
    description:
      'Get clinic members. Use ?role=DOCTOR to get only doctors and owners.',
    queryParams: [
      { name: 'role', type: 'string', description: 'Filter by role, e.g. DOCTOR' },
    ],
    responseHint: '{ members: [{ id, user_email, display_name, role, status }], currentUserRole: string }',
  },
  {
    method: 'POST',
    path: '/api/clinic/members',
    description: 'Add a clinic member.',
    bodyFields: [
      { name: 'email', type: 'string', required: true, description: 'Member email' },
      { name: 'role', type: 'string', description: 'Role (default: DOCTOR)' },
      { name: 'displayName', type: 'string', description: 'Display name' },
    ],
    permission: 'OWNER only',
  },
  {
    method: 'PUT',
    path: '/api/clinic/members',
    description: 'Update a member display name.',
    bodyFields: [
      { name: 'id', type: 'number', required: true, description: 'Member id' },
      { name: 'displayName', type: 'string', required: true, description: 'New display name' },
    ],
    permission: 'OWNER only',
  },
  {
    method: 'DELETE',
    path: '/api/clinic/members',
    description: 'Remove a clinic member.',
    queryParams: [
      { name: 'id', type: 'string', required: true, description: 'Member id' },
    ],
    permission: 'OWNER only',
  },

  // ── Clinic Treatments ─────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/clinic/treatments',
    description: 'Get configured treatment types for the clinic.',
    responseHint: 'Array of { id, name }',
  },
  {
    method: 'POST',
    path: '/api/clinic/treatments',
    description: 'Add a treatment type (upserts).',
    bodyFields: [
      { name: 'name', type: 'string', required: true, description: 'Treatment name, e.g. RCT, Crown' },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/clinic/treatments',
    description: 'Delete a treatment type.',
    bodyFields: [
      { name: 'id', type: 'number', required: true, description: 'Treatment id' },
    ],
  },

  // ── Misc ──────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/clinic/invoice',
    description: 'Get the next invoice number (atomically incremented).',
    responseHint: '{ invoice_number: number }',
  },
  {
    method: 'GET',
    path: '/api/auth/role',
    description: "Get the current user's role in this clinic.",
    responseHint: '{ role: "OWNER" | "ADMIN" | "DOCTOR" | "RECEPTIONIST" | null }',
  },
  {
    method: 'GET',
    path: '/api/health',
    description: 'Health check endpoint.',
    responseHint: '{ status: "ok", timestamp, environment }',
  },
];

// ── Helper: build a text description from the manifest for an LLM prompt ──
export function buildEndpointDocs(): string {
  const groups: Record<string, Endpoint[]> = {};
  for (const ep of apiManifest) {
    // Group by first two path segments: /api/patients/[id] → "Patients"
    const segments = ep.path.split('/').filter(Boolean); // ["api", "patients", ...]
    const key = (segments[1] || 'other').replace(/^\w/, (c) => c.toUpperCase());
    (groups[key] ??= []).push(ep);
  }

  const lines: string[] = [];
  for (const [group, endpoints] of Object.entries(groups)) {
    lines.push(`### ${group}`);
    for (const ep of endpoints) {
      lines.push(`- **${ep.method} ${ep.path}**`);
      lines.push(`  ${ep.description}`);

      if (ep.queryParams?.length) {
        const params = ep.queryParams
          .map((p) => `${p.name}${p.required ? ' (required)' : ''}: ${p.description}`)
          .join('; ');
        lines.push(`  Query params: ${params}`);
      }
      if (ep.bodyFields?.length) {
        const required = ep.bodyFields.filter((f) => f.required);
        const optional = ep.bodyFields.filter((f) => !f.required);
        const parts: string[] = [];
        if (required.length)
          parts.push(`Required: ${required.map((f) => `${f.name} (${f.description})`).join(', ')}`);
        if (optional.length)
          parts.push(`Optional: ${optional.map((f) => f.name).join(', ')}`);
        lines.push(`  Body: ${parts.join('. ')}`);
      }
      if (ep.responseHint) {
        lines.push(`  Returns: ${ep.responseHint}`);
      }
      if (ep.permission) {
        lines.push(`  Permission: ${ep.permission}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
