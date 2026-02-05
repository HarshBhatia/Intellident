export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  purpose: string; // 'Paid for'
  mode: string;
}

export interface Patient {
  id?: number;
  patient_id: string;
  name: string;
  age: number;
  amount: number; // Represents Total Paid now
  date: string;
  doctor: string;
  gender: string;
  mode_of_payment: string; // Deprecated, kept for backward compat or last payment mode
  paid_for: string; // Deprecated
  phone_number: string;
  medicine_prescribed: string;
  notes: string;
  patient_type: string;
  share: string;
  tooth_number: string;
  treatment_done: string;
  xrays?: string; // JSON string of XRay[]
  payments?: string; // JSON string of PaymentRecord[]
}
