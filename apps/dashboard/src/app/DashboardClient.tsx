'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Patient } from '@/types';
import PatientTable from '@/components/PatientTable';
import AddPatientForm from '@/components/AddPatientForm';
import Skeleton from '@/components/Skeleton';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicInfo, setClinicInfo] = useState<{ clinic_name: string } | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'add'>('list');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const fetchClinicInfo = async () => {
    try {
      const res = await fetch('/api/clinic-info');
      if (res.ok) {
        const data = await res.json();
        setClinicInfo(data);
      }
    } catch (error) {
      console.error('Error fetching clinic info:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.status === 401) {
        router.push('/sign-in');
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
    fetchClinicInfo();
    fetchDoctors();
  }, []);

  const filteredPatients = useMemo(() => {
    return (patients || []).filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone_number?.includes(searchTerm) ||
      p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  const userName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Doctor';

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRevenue = (patients || []).reduce((sum, p) => {
        // This is a rough estimate since we only have last_visit and not all visits here
        // In a real app, we'd fetch this from a summary API
        return sum + (p.last_visit === today ? 500 : 0); // Placeholder logic
    }, 0);

    return {
        totalPatients: (patients || []).length,
        doctorsCount: (doctors || []).length,
        todayRevenue
    };
  }, [patients, doctors]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans transition-colors">
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {!loading && doctors.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-200 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="flex-1 text-sm font-medium">
              Your clinic has no doctors yet. You need to add at least one doctor to tag visits correctly.
            </div>
            <button 
              onClick={() => router.push('/settings?tab=doctors')}
              className="px-3 py-1 bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-700 transition"
            >
              Add Doctor
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Patients</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{stats.totalPatients}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today's Visits</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                            {patients.filter(p => p.last_visit === new Date().toISOString().split('T')[0]).length}
                        </p>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Doctors</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{stats.doctorsCount}</p>
                    </div>
                </div>
            </div>
        </div>

        {view === 'list' ? (
          <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Patient Records</h2>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span>Welcome, <span className="font-semibold text-gray-700 dark:text-gray-200">{userName}</span></span>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span>Managing <span className="font-semibold text-blue-600 dark:text-blue-400">{clinicInfo?.clinic_name || 'Clinic'}</span></span>
                  </div>
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
                      <span className="hidden sm:inline">Add Patient</span>
                      <span className="sm:hidden ml-1">Add</span>
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
                <PatientTable 
                    patients={filteredPatients} 
                    onAddClick={() => setView('add')}
                />
             )}
          </div>
        )}
      </main>
    </div>
  );
}