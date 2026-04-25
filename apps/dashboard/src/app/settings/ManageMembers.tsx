'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useClinic } from '@/context/ClinicContext';
import type { ClinicMember } from '@/types';

export default function ManageMembers() {
  const { showToast } = useToast();
  const { refreshDoctors } = useClinic();
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [myRole, setMyRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'DOCTOR' | 'STAFF' | 'ADMIN'>('DOCTOR');
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/clinic/members');
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
      const res = await fetch('/api/clinic/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, role: newRole, displayName: newName || undefined })
      });

      if (res.ok) {
        showToast('Member added successfully', 'success');
        setNewEmail('');
        setNewName('');
        setNewRole('DOCTOR');
        fetchMembers();
        refreshDoctors();
      } else {
        showToast('Failed to add member', 'error');
      }
    } catch (error) {
      showToast('Error adding member', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateName = async (id: number) => {
    try {
      const res = await fetch('/api/clinic/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, displayName: editName })
      });
      if (res.ok) {
        showToast('Name updated', 'success');
        setEditingId(null);
        fetchMembers();
        refreshDoctors();
      } else {
        showToast('Failed to update name', 'error');
      }
    } catch (error) {
      showToast('Error updating name', 'error');
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await fetch(`/api/clinic/members?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Member removed', 'success');
        fetchMembers();
        refreshDoctors();
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
        <form onSubmit={handleInvite} className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm transition-colors space-y-3 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Dr. Name"
              className="w-40 p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'DOCTOR' | 'STAFF' | 'ADMIN')}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="DOCTOR">Doctor</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? 'Adding...' : 'Add'}
            </button>
          </div>
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
              <div className="flex flex-col gap-0.5">
                {editingId === m.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Display name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateName(m.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm font-medium text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => handleUpdateName(m.id)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 dark:text-gray-200 font-semibold">
                      {m.display_name || m.user_email}
                    </span>
                    {isOwner && m.role !== 'OWNER' && (
                      <button
                        onClick={() => { setEditingId(m.id); setEditName(m.display_name || ''); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity"
                        title="Edit name"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                  </div>
                )}
                <span className="text-xs text-gray-400 font-medium">
                  {m.display_name ? `${m.user_email} · ` : ''}{m.role} · {m.status}
                </span>
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
