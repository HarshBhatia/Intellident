'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import Skeleton from '@/components/Skeleton';

interface Clinic {
  id: number;
  name: string;
  role: string;
}

export default function SelectClinicPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');

  useEffect(() => {
    if (!isLoaded || !user) return;
    
    fetch('/api/clinics')
      .then(res => res.json())
      .then(data => {
        setClinics(data);
        setLoading(false);
      });
  }, [isLoaded, user]);

  const handleSelect = async (clinicId: number) => {
    // Set cookie or session for selected clinic
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId })
    });
    router.push('/');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim()) return;
    setCreating(true);
    
    try {
      const res = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClinicName })
      });
      if (res.ok) {
        const newClinic = await res.json();
        handleSelect(newClinic.id);
      }
    } catch (error) {
      console.error(error);
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 relative">
      <div className="absolute top-4 right-4">
        <SignOutButton redirectUrl="/sign-in">
          <button className="text-sm font-medium text-gray-500 hover:text-red-600 transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign out
          </button>
        </SignOutButton>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Select Clinic</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Choose a workspace to continue</p>
        </div>

        <div className="space-y-4">
          {clinics.map(clinic => (
            <button
              key={clinic.id}
              onClick={() => handleSelect(clinic.id)}
              className="w-full p-6 text-left bg-white dark:bg-gray-800 rounded-xl border-2 border-transparent hover:border-blue-500 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {clinic.name}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400">
                  {clinic.role}
                </span>
              </div>
            </button>
          ))}

          <form onSubmit={handleCreate} className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or create a new clinic
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newClinicName}
                onChange={(e) => setNewClinicName(e.target.value)}
                placeholder="Clinic Name"
                className="flex-1 p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={creating || !newClinicName}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
