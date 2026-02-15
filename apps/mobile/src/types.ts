export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  mode: string;
}

export interface Patient {
  id?: number;
  patient_id: string;
  name: string;
  age: number;
  amount: number;
  date: string;
  doctor: string;
  gender: string;
  mode_of_payment: string;
  phone_number: string;
  medicine_prescribed: string;
  notes: string;
  patient_type: string;
  share: string;
  tooth_number: string;
  treatment_done: string;
  xrays?: string;
  payments?: string;
}
