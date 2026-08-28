'use client';

import { flags, type FlagKey } from '@/lib/flags';

export default function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: FlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!flags[flag]) return <>{fallback}</>;
  return <>{children}</>;
}
