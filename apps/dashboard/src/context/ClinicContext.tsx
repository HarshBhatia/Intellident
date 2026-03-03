'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  const fetchClinic = useCallback(async () => {
    try {
      const res = await fetch('/api/clinic-info/');
      if (res.ok) {
        const data = await res.json();
        setClinic(data);
      }
    } catch (error) {
      console.error('Failed to fetch clinic info:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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