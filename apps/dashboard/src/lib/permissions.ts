export type Role = 'OWNER' | 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

export type Permission =
  | 'patients.create'
  | 'patients.update'
  | 'patients.delete'
  | 'visits.create'
  | 'visits.update'
  | 'visits.delete'
  | 'clinical_notes.edit'
  | 'appointments.manage'
  | 'payments.create'
  | 'billing.admin'
  | 'members.manage';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  RECEPTIONIST: [
    'patients.create',
    'visits.create',
    'appointments.manage',
    'payments.create',
  ],
  DOCTOR: [
    'patients.create',
    'patients.update',
    'visits.create',
    'visits.update',
    'visits.delete',
    'clinical_notes.edit',
    'appointments.manage',
    'payments.create',
  ],
  ADMIN: [
    'patients.create',
    'patients.update',
    'patients.delete',
    'visits.create',
    'visits.update',
    'visits.delete',
    'clinical_notes.edit',
    'appointments.manage',
    'payments.create',
    'billing.admin',
  ],
  OWNER: [
    'patients.create',
    'patients.update',
    'patients.delete',
    'visits.create',
    'visits.update',
    'visits.delete',
    'clinical_notes.edit',
    'appointments.manage',
    'payments.create',
    'billing.admin',
    'members.manage',
  ],
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
