'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/types';
import PatientTable from '@/components/PatientTable';
import AddPatientForm from '@/components/AddPatientForm';

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [view, setView] = useState<'list' | 'add'>('list');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPatients = async () => {
    try {
      // Auto-init DB for convenience (normally done via migration scripts)
      await fetch('/api/init');

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

  const handleLogout = () => {
    document.cookie = 'auth_token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">IntelliDent Dashboard</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('list')}
            className={`px-3 py-1 rounded ${view === 'list' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
          >
            List
          </button>
          <button 
            onClick={() => setView('add')}
            className={`px-3 py-1 rounded ${view === 'add' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
          >
            Add Patient
          </button>
          <button onClick={handleLogout} className="text-sm underline hover:text-blue-200 ml-4">Logout</button>
        </div>
      </header>

      <main className="p-6">
        {view === 'list' ? (
          <div className="bg-white rounded shadow p-4">
             <div className="flex justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Patient Records</h2>
                <button onClick={() => setView('add')} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">
                  + Add New
                </button>
             </div>
             <PatientTable patients={patients} />
          </div>
        ) : (
          <AddPatientForm 
            onSuccess={() => {
              setView('list');
              fetchPatients();
            }}
            onCancel={() => setView('list')}
          />
        )}
      </main>
    </div>
  );
}