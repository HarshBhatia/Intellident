export interface BillingItem {
  description: string;
  amount: number;
}

export interface XRay {
  url: string;
  name: string;
  date: string;
}

export interface Visit {
  id?: number;
  clinic_id: number;
  patient_id: number;
  date: string;
  doctor?: string;
  visit_type?: string;
  clinical_findings?: string;
  procedure_notes?: string;
  tooth_number?: string;
  medicine_prescribed?: string;
  cost?: number; // Total cost of the visit (sum of billing items)
  paid?: number; // Amount paid for this visit
  xrays?: string; // JSON string of XRay[]
  billing_items?: BillingItem[]; // New field: JSON string of BillingItem[]
  created_at?: string;
}

export interface Patient {
  id?: number;
  patient_id: string; // Unique ID for the patient within a clinic (e.g., PID-001)
  name: string;
  age?: number;
  gender?: string;
  phone_number?: string;
  patient_type?: string; // e.g., "New", "Regular", "Emergency"
  user_email?: string; // Associated Clerk user email if any
  clinic_id: number;
  created_at?: string;
  last_visit?: string;
  visits?: Visit[]; // Optional: for detailed patient view
}