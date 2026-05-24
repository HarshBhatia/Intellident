'use client';

import { useState, useEffect, useCallback } from 'react';
import { type Role, type Permission, hasPermission } from '@/lib/permissions';

interface UsePermissionsResult {
  role: Role | null;
  loading: boolean;
  can: (permission: Permission) => boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/role')
      .then(r => r.json())
      .then(data => setRole(data.role ?? null))
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, []);

  const can = useCallback(
    (permission: Permission) => hasPermission(role, permission),
    [role]
  );

  return { role, loading, can };
}
