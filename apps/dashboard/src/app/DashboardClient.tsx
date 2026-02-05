'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Patient } from '@/types';
import PatientTable from '@/components/PatientTable';
import AddPatientForm from '@/components/AddPatientForm';
import Skeleton from '@/components/Skeleton';
import Navbar from '@/components/Navbar';

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [view, setView] = useState<'list' | 'add'>('list');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Update URL when search term changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    // Only update if the search param actually changed to avoid redundant history entries
    if (params.get('search') !== searchParams.get('search')) {
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [searchTerm, router, searchParams]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone_number?.includes(searchTerm) ||
      p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans transition-colors">
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {view === 'list' ? (
          <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Patient Records</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage and view all your clinic patients.</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial justify-end">
                    <div className="relative flex-1 sm:flex-initial">
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full sm:w-64 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 transition-all sm:focus:w-80"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <button 
                      onClick={() => setView('add')} 
                      className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent rounded shadow-sm text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition active:scale-[0.98] whitespace-nowrap"
                    >
                      <svg className="sm:-ml-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden xs:inline">Add Patient</span>
                      <span className="xs:hidden ml-1">Add</span>
                    </button>
                </div>
             </div>
             
             {loading ? (
                 <div className="border border-gray-200 dark:border-gray-800 rounded overflow-hidden shadow-sm bg-white dark:bg-gray-900">
                    <div className="bg-gray-50 dark:bg-gray-800/50 h-12 border-b dark:border-gray-800 flex items-center px-6">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-16 border-b dark:border-gray-800 flex items-center px-6 gap-4">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))}
                 </div>
             ) : (
                <PatientTable patients={filteredPatients} />
             )}
          </div>
        ) : (
          <div className="flex justify-center pt-10">
            <AddPatientForm 
              onSuccess={() => {
                setView('list');
                fetchPatients();
              }}
              onCancel={() => setView('list')}
            />
          </div>
        )}
      </main>
    </div>
  );
}