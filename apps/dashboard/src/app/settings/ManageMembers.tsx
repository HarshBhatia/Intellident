'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';

interface Member {
  id: number;
  user_email: string;
  role: string;
  status: string;
}

export default function ManageMembers() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setMyRole(data.currentUserRole || '');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setInviting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      });
      
      if (res.ok) {
        showToast('Member invited successfully', 'success');
        setNewEmail('');
        fetchMembers();
      } else {
        showToast('Failed to invite member', 'error');
      }
    } catch (error) {
      showToast('Error inviting member', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Member removed', 'success');
        fetchMembers();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const isOwner = myRole === 'OWNER';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clinic Members</h2>
        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded border border-blue-100 dark:border-blue-900/50 uppercase tracking-widest">{members.length} Users</span>
      </div>

      {isOwner && (
        <form onSubmit={handleInvite} className="flex gap-3 mb-10 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <input 
            type="email" 
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="flex-1 p-2 bg-transparent outline-none text-gray-900 dark:text-gray-100 text-sm font-medium"
          />
          <button 
            type="submit" 
            disabled={inviting}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
           {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-md"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg hover:shadow-md transition group">
              <div className="flex flex-col">
                <span className="text-gray-800 dark:text-gray-200 font-semibold">{m.user_email}</span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{m.role} • {m.status}</span>
              </div>
              {isOwner && m.role !== 'OWNER' && (
                <button onClick={() => handleRemove(m.id)} className="text-red-300 hover:text-red-600 transition p-2">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
