'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

function pageName(pathname: string): string | null {
  if (pathname === '/') return 'dashboard';
  if (pathname.startsWith('/patients/')) return 'patient_detail';
  if (pathname.startsWith('/patients')) return 'patients';
  if (pathname.startsWith('/scheduler')) return 'scheduler';
  if (pathname.startsWith('/earnings')) return 'earnings';
  if (pathname.startsWith('/expenses')) return 'expenses';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/select-clinic')) return 'select_clinic';
  if (pathname.startsWith('/privacy')) return 'privacy';
  if (pathname.startsWith('/terms')) return 'terms';
  return null;
}

export default function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const page = pageName(pathname);
    if (page) trackEvent('page_view_named', { page });
  }, [pathname]);
  return null;
}
