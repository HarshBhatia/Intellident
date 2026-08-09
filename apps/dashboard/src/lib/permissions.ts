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
  | 'members.manage'
  | 'clinic.update';

/** Roles an owner may assign when inviting a member. OWNER is never assignable. */
export const ASSIGNABLE_ROLES: Role[] = ['ADMIN', 'DOCTOR', 'RECEPTIONIST'];

const ROLE_ALIASES: Record<string, Role> = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  STAFF: 'RECEPTIONIST',
};

export function normalizeRole(role: string | null | undefined): Role | null {
  if (!role) return null;
  return ROLE_ALIASES[role.trim().toUpperCase()] ?? null;
}

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
    'clinic.update',
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
    'clinic.update',
  ],
};

export function hasPermission(role: Role | string | null | undefined, permission: Permission): boolean {
  const normalized = typeof role === 'string' ? normalizeRole(role) : role;
  if (!normalized) return false;
  return ROLE_PERMISSIONS[normalized]?.includes(permission) ?? false;
}
