import { hasPermission, normalizeRole, type Permission, type Role } from './permissions';

const ALL: Permission[] = [
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
];

const ALLOWED: Record<Role, Permission[]> = {
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
  OWNER: ALL,
};

describe('permissions', () => {
  it('normalizes STAFF to RECEPTIONIST', () => {
    expect(normalizeRole('staff')).toBe('RECEPTIONIST');
    expect(normalizeRole('STAFF')).toBe('RECEPTIONIST');
  });

  it('returns null for unknown roles', () => {
    expect(normalizeRole('intern')).toBeNull();
    expect(hasPermission(null, 'patients.create')).toBe(false);
  });

  (Object.keys(ALLOWED) as Role[]).forEach((role) => {
    ALL.forEach((permission) => {
      const expected = ALLOWED[role].includes(permission);
      it(`${role} ${expected ? 'can' : 'cannot'} ${permission}`, () => {
        expect(hasPermission(role, permission)).toBe(expected);
      });
    });
  });

  it('receptionist cannot edit clinical notes or billing', () => {
    expect(hasPermission('RECEPTIONIST', 'clinical_notes.edit')).toBe(false);
    expect(hasPermission('RECEPTIONIST', 'billing.admin')).toBe(false);
    expect(hasPermission('RECEPTIONIST', 'patients.delete')).toBe(false);
  });
});
