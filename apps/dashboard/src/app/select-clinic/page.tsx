'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/hooks/useAuth';

interface Clinic {
  id: number;
  name: string;
  role: string;
}

export default function SelectClinicPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch('/api/clinics')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setClinics(data);
        setLoading(false);
      });
  }, [isLoaded, user?.id]);

  const handleSelect = async (clinicId: number) => {
    await fetch('/api/auth/session/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId })
    });
    router.push('/');
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/logout/', { method: 'POST' });
    await signOut({ redirectUrl: '/sign-in' });
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
    } catch { setCreating(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-32 w-64" /></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="absolute top-4 right-4">
        <button onClick={handleSignOut} className="text-sm font-medium text-gray-500 hover:text-red-600 transition flex items-center gap-1">Sign out</button>
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Select Clinic</h1>
          <p className="text-gray-500">Choose a workspace to continue</p>
        </div>
        <div className="space-y-4">
          {clinics.map(c => (
            <button key={c.id} onClick={() => handleSelect(c.id)} className="w-full p-6 text-left bg-white dark:bg-gray-800 rounded-xl border-2 border-transparent hover:border-blue-500 shadow-sm transition-all">
              <div className="flex justify-between items-center"><span className="font-bold">{c.name}</span><span className="text-xs uppercase tracking-widest text-gray-400">{c.role}</span></div>
            </button>
          ))}
          <form onSubmit={handleCreate} className="pt-4 border-t dark:border-gray-800 flex gap-2">
            <input type="text" value={newClinicName} onChange={e => setNewClinicName(e.target.value)} placeholder="New Clinic Name" className="flex-1 p-2.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
            <button type="submit" disabled={creating || !newClinicName} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold">Create</button>
          </form>
        </div>
      </div>
    </div>
  );
}