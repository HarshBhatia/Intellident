// ============================================================================
// Core Domain Types
// ============================================================================

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
  doctor_email?: string;
  doctor_user_id?: string;
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
  referral_source?: string;
  created_at?: string;
  last_visit?: string;
  visits?: Visit[];
}

// ============================================================================
// Clinic Types
// ============================================================================

export interface Clinic {
  id: number;
  name: string;
  role: string;
}

export interface ClinicInfo {
  clinic_name: string;
  owner_name: string;
  phone: string;
  address: string;
  email: string;
  google_maps_link: string;
}

export interface ClinicMember {
  id: number;
  clinic_id: number;
  user_email: string;
  user_id?: string;
  display_name?: string;
  role: string;
  status: string;
  created_at: string;
}

// Alias for backward compatibility (doctors are now clinic members)
export type Doctor = ClinicMember;

// ============================================================================
// Financial Types
// ============================================================================

export interface Expense {
  id: number;
  date: string;
  amount: number;
  category: string;
  description: string;
  clinic_id: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  clinic_id: string;
}

export interface StatsResult {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  pieData: { name: string; value: number }[];
  monthlyTrend: { month: string; revenue: number }[];
}

// ============================================================================
// Treatment Types
// ============================================================================

export interface Treatment {
  id: number;
  name: string;
  clinic_id: string;
}

// ============================================================================
// Appointment Types
// ============================================================================

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
  id?: number;
  clinic_id: number;
  patient_id?: number | null;
  patient_name?: string;
  walk_in_name?: string;
  walk_in_phone?: string;
  doctor_email?: string;
  doctor_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  visit_type?: string;
  status: AppointmentStatus;
  notes?: string;
  visit_id?: number | null;
  created_at?: string;
}

// ============================================================================
// UI/Component Types
// ============================================================================

export type DentitionType = 'Adult' | 'Child';
export type SortDirection = 'asc' | 'desc';
export type Theme = 'dark' | 'light' | 'system';
export type ToastType = 'success' | 'error' | 'info';

