'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ClinicInfo, Doctor } from '@intellident/api';

interface ClinicContextType {
  clinic: ClinicInfo | null;
  doctors: Doctor[];
  loading: boolean;
  refreshClinic: () => Promise<void>;
  refreshDoctors: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchClinic = useCallback(async () => {
    try {
      console.log('[ClinicProvider] Fetching clinic info...');
      const res = await fetch('/api/clinic?id=current');
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

  const fetchDoctors = useCallback(async () => {
    try {
      console.log('[ClinicProvider] Fetching doctors...');
      const res = await fetch('/api/clinic/members?role=DOCTOR');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.members || []);
        console.log('[ClinicProvider] Doctors loaded:', (data.members || []).length);
      }
    } catch (error) {
      console.error('[ClinicProvider] Error fetching doctors:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchClinic(), fetchDoctors()]);
    };
    init();
  }, [fetchClinic, fetchDoctors]);

  return (
    <ClinicContext.Provider value={{ 
      clinic, 
      doctors, 
      loading, 
      refreshClinic: fetchClinic,
      refreshDoctors: fetchDoctors 
    }}>
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
