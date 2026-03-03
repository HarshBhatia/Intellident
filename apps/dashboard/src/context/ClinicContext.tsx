'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ClinicInfo {
  clinic_name: string;
  owner_name: string;
  phone: string;
  address: string;
  email: string;
  google_maps_link: string;
}

interface ClinicContextType {
  clinic: ClinicInfo | null;
  loading: boolean;
  refreshClinic: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchClinic = useCallback(async () => {
    try {
      console.log('[ClinicProvider] Fetching clinic info...');
      const res = await fetch('/api/clinic-info/');
      if (res.ok) {
        const data = await res.json();
        setClinic(data);
        console.log('[ClinicProvider] Clinic info loaded:', data.clinic_name);
      } else if (res.status === 403) {
        console.warn('[ClinicProvider] Forbidden access to clinic. Redirecting to selection...');
        router.push('/select-clinic');
      } else {
        console.warn('[ClinicProvider] Failed to fetch clinic info:', res.status);
      }
    } catch (error) {
      console.error('[ClinicProvider] Error fetching clinic info:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchClinic();
  }, [fetchClinic]);

  return (
    <ClinicContext.Provider value={{ clinic, loading, refreshClinic: fetchClinic }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}
