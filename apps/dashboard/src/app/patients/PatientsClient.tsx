'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Patient } from '@/types';
import PatientTable from '@/components/PatientTable';
import AddPatientForm from '@/components/AddPatientForm';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/context/ClinicContext';

export default function PatientsClient() {
  const { user } = useAuth();
  const { clinic: clinicInfo } = useClinic();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'add'>(searchParams.get('add') === 'true' || searchParams.get('new') === '1' ? 'add' : 'list');

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) setPatients(await res.json());
    } catch { setPatients([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user?.id) fetchPatients();
  }, [user?.id, fetchPatients]);

  const filtered = useMemo(() =>
    (patients || []).filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone_number?.includes(searchTerm) ||
      p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [patients, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'list' ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Patients</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loading ? '—' : patients.length} records ·{' '}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{clinicInfo?.clinic_name || 'Clinic'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                <div className="relative flex-1 sm:flex-initial">
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm w-full sm:w-64 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all sm:focus:w-80 placeholder-gray-400"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setView('add')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Patient
                </button>
              </div>
            </div>

            {loading ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 border-b dark:border-gray-800 flex items-center px-6 gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <PatientTable patients={filtered} onAddClick={() => setView('add')} onDeleteSuccess={fetchPatients} />
            )}
          </>
        ) : (
          <div className="flex justify-center pt-4">
            <AddPatientForm onSuccess={() => { setView('list'); fetchPatients(); }} onCancel={() => setView('list')} />
          </div>
        )}
      </main>
    </div>
  );
}
