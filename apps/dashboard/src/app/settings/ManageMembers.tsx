'use client';

import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useClinic } from '@/context/ClinicContext';
import type { ClinicMember } from '@/types';

const ROLE_LABELS: Record<string, string> = { OWNER: 'Owner', DOCTOR: 'Doctor', STAFF: 'Staff', ADMIN: 'Admin' };
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  DOCTOR: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  STAFF: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500',
  ADMIN: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
};
const AVATAR_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
}

export default function ManageMembers() {
  const { showToast } = useToast();
  const { refreshDoctors } = useClinic();
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [myRole, setMyRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'invited'>('all');

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'DOCTOR' | 'STAFF' | 'ADMIN'>('DOCTOR');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

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
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const isOwner = myRole === 'OWNER';

  const counts = useMemo(() => ({
    all: members.length,
    active: members.filter(m => m.status === 'ACTIVE').length,
    invited: members.filter(m => m.status !== 'ACTIVE').length,
  }), [members]);

  const filtered = useMemo(() =>
    members
      .filter(m => filter === 'all' || (filter === 'active' && m.status === 'ACTIVE') || (filter === 'invited' && m.status !== 'ACTIVE'))
      .filter(m => !search || (m.display_name || '').toLowerCase().includes(search.toLowerCase()) || m.user_email.toLowerCase().includes(search.toLowerCase())),
    [members, filter, search]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setInviting(true);
    try {
      const res = await fetch('/api/clinic/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, role: newRole, displayName: newName || undefined }),
      });
      if (res.ok) {
        showToast('Member added', 'success');
        setNewEmail(''); setNewName(''); setNewRole('DOCTOR');
        setShowInviteForm(false);
        fetchMembers(); refreshDoctors();
      } else { showToast('Failed to add member', 'error'); }
    } catch { showToast('Error adding member', 'error'); }
    finally { setInviting(false); }
  };

  const handleUpdateName = async (id: number) => {
    try {
      const res = await fetch('/api/clinic/members', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, displayName: editName }),
      });
      if (res.ok) { showToast('Name updated', 'success'); setEditingId(null); fetchMembers(); refreshDoctors(); }
    } catch {}
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await fetch(`/api/clinic/members?id=${id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Member removed', 'success'); fetchMembers(); refreshDoctors(); }
    } catch {}
  };

  return (
    <>
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
        <div className="flex-1">
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Clinic Members</h2>
          <p className="text-xs text-gray-400 mt-0.5">Doctors, assistants and front-desk staff who can sign in to this clinic.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{members.length} members</span>
          {isOwner && (
            <button onClick={() => setShowInviteForm(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">
              + Invite member
            </button>
          )}
        </div>
      </div>

      {/* Invite form */}
      {isOwner && showInviteForm && (
        <form onSubmit={handleInvite} className="mx-6 mt-5 p-4 border border-dashed border-blue-200 dark:border-blue-900/40 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Add a new team member</p>
          <div className="flex gap-2 flex-wrap">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
              className="w-36 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100" />
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="colleague@example.com" required
              className="flex-1 min-w-48 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100" />
            <select value={newRole} onChange={e => setNewRole(e.target.value as any)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100">
              <option value="DOCTOR">Doctor</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" disabled={inviting}
              className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50 whitespace-nowrap">
              {inviting ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowInviteForm(false)}
              className="px-3 py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="M21 21l-4.3-4.3"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100" />
        </div>
        {(['all', 'active', 'invited'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition ${filter === f ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Pending'}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white dark:bg-gray-800 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-6 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {['Member', 'Role', 'Status', 'Last active', ''].map(h => (
                <th key={h} className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((m, idx) => {
              const name = m.display_name || m.user_email;
              const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const isActive = m.status === 'ACTIVE';
              return (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ring-2 ring-white dark:ring-gray-900`}
                        style={{ background: isActive ? avatarBg : undefined, ...(isActive ? {} : { background: 'transparent', border: '1.5px dashed #94a3b8', color: '#94a3b8' }) }}>
                        {isActive ? initials(name) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        )}
                      </div>
                      <div>
                        {editingId === m.id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleUpdateName(m.id); if (e.key === 'Escape') setEditingId(null); }}
                              className="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100" />
                            <button onClick={() => handleUpdateName(m.id)} className="text-xs font-bold text-blue-600">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">×</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{name}</span>
                            {isOwner && (
                              <button onClick={() => { setEditingId(m.id); setEditName(m.display_name || ''); }}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-opacity p-0.5 rounded">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                              </button>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 font-medium mt-0.5">{m.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${ROLE_COLORS[m.role] || ROLE_COLORS.STAFF}`}>
                      {ROLE_LABELS[m.role] || m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'bg-gray-400'}`} />
                      {isActive ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                    {isActive ? 'Recently active' : 'Invite sent'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {m.role === 'OWNER'
                        ? <span className="text-[11px] text-gray-400 font-semibold px-2">You</span>
                        : isOwner && (
                          <button onClick={() => handleRemove(m.id)}
                            className="text-xs font-semibold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition">
                            Remove
                          </button>
                        )
                      }
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">No members match.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
