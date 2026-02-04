'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/types';
import PatientTable from '@/components/PatientTable';
import AddPatientForm from '@/components/AddPatientForm';
import Skeleton from '@/components/Skeleton';

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [view, setView] = useState<'list' | 'add'>('list');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

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

  const handleLogout = () => {
    document.cookie = 'auth_token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 text-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
               <div className="bg-blue-600 text-white p-1.5 rounded shadow-sm">
                 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.5 2h-13C4.1 2 3 4.1 3 6.5c0 2.5 1.5 4.5 3 6v7c0 1.4 1.1 2.5 2.5 2.5h1c1.1 0 2-0.9 2-2v-4h1v4c0 1.1 0.9 2 2 2h1c1.4 0 2.5-1.1 2.5-2.5v-7c1.5-1.5 3-3.5 3-6 0-2.4-1.1-4.5-2.5-4.5z" />
                 </svg>
               </div>
              <span className="font-bold text-xl tracking-tight">IntelliDent</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => router.push('/earnings')} 
                className="text-gray-500 hover:text-green-600 text-sm font-medium transition flex items-center gap-1"
                title="Earnings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="hidden md:inline">Earnings</span>
              </button>
              <button 
                onClick={() => router.push('/expenses')} 
                className="text-gray-500 hover:text-red-600 text-sm font-medium transition flex items-center gap-1"
                title="Expenses"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="hidden md:inline">Expenses</span>
              </button>
              <button 
                onClick={() => router.push('/settings')} 
                className="text-gray-500 hover:text-blue-600 text-sm font-medium transition flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="hidden md:inline">Settings</span>
              </button>
              <button 
                onClick={handleLogout} 
                className="text-gray-500 hover:text-red-600 text-sm font-medium transition flex items-center gap-1"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {view === 'list' ? (
          <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Patient Records</h2>
                  <p className="text-gray-500 text-sm mt-1">Manage and view all your clinic patients.</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial justify-end">
                    <div className="relative flex-1 sm:flex-initial">
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-2 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full sm:w-64 text-gray-900 bg-white transition-all sm:focus:w-80"
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
                 <div className="border border-gray-200 rounded overflow-hidden shadow-sm bg-white">
                    <div className="bg-gray-50 h-12 border-b flex items-center px-6">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-16 border-b flex items-center px-6 gap-4">
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