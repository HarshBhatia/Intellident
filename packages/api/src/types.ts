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
  cost?: number;
  paid?: number;
  xrays?: string;
  billing_items?: BillingItem[];
  dentition_type?: 'Adult' | 'Child';
  created_at?: string;
}

export interface Patient {
  id?: number;
  patient_id: string;
  name: string;
  age?: number;
  gender?: string;
  phone_number?: string;
  patient_type?: string;
  user_email?: string;
  clinic_id: number;
  is_active?: boolean;
  xrays?: string;
  created_at?: string;
  last_visit?: string;
  visits?: Visit[];
}
