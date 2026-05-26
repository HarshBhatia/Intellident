'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Patient } from '@/types';
import PatientTable from '@/components/PatientTable';
import AddPatientForm from '@/components/AddPatientForm';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/context/ClinicContext';
import { useRefreshOnAiWrite } from '@/hooks/useRefreshOnAiWrite';

// ─── Segments ─────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: 'all',      label: 'All patients',      dot: null,      filter: (_: Patient) => true },
  { id: 'upcoming', label: 'Upcoming visits',   dot: '#2563eb', filter: (p: Patient) => !!p.next_visit },
  { id: 'dues',     label: 'Has outstanding',   dot: '#dc2626', filter: (p: Patient) => (p.balance ?? 0) > 0 },
  { id: 'recent',   label: 'Recent visits',     dot: '#16a34a', filter: (p: Patient) => {
    if (!p.last_visit) return false;
    return (Date.now() - new Date(p.last_visit).getTime()) < 30 * 86400000;
  }},
  { id: 'inactive', label: 'Inactive 6mo+',    dot: '#94a3b8', filter: (p: Patient) => {
    if (!p.last_visit) return false;
    return (Date.now() - new Date(p.last_visit).getTime()) > 180 * 86400000;
  }},
  { id: 'new',      label: 'No visits yet',     dot: '#a855f7', filter: (p: Patient) => !p.last_visit },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcUsers = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const IcCal = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>;
const IcRupee = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M6 9h12M9 13c4 0 6-2 6-4M6 13h2m0 0c0 4 4 6 8 6"/></svg>;
const IcAlert = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-2.99l-7.07-12a2 2 0 00-3.48 0l-7.07 12A2 2 0 004.93 19z"/></svg>;
const IcSearch = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="M21 21l-4.3-4.3"/></svg>;
const IcTable = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path strokeLinecap="round" d="M3 10h18M3 16h18M9 4v16"/></svg>;
const IcGrid = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;

export default function PatientsClient() {
  const { user } = useAuth();
  const { clinic: clinicInfo } = useClinic();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [segment, setSegment] = useState(
    searchParams.get('segment') && SEGMENTS.some(s => s.id === searchParams.get('segment'))
      ? searchParams.get('segment')!
      : 'all'
  );
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAdd, setShowAdd] = useState(
    searchParams.get('add') === 'true' || searchParams.get('new') === '1'
  );

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

  useRefreshOnAiWrite(fetchPatients);

  // Segment counts computed from all patients
  const segmentCounts = useMemo(() =>
    Object.fromEntries(SEGMENTS.map(s => [s.id, patients.filter(s.filter).length])),
    [patients]);

  // Apply segment then search
  const filtered = useMemo(() => {
    const seg = SEGMENTS.find(s => s.id === segment)!;
    let arr = patients.filter(seg.filter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      arr = arr.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.phone_number?.includes(q) ||
        p.patient_id?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [patients, segment, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const totalDues = patients.reduce((s, p) => s + Math.max(0, Number(p.balance) || 0), 0);
    const upcoming = patients.filter(p => p.next_visit).length;
    const inactive = patients.filter(p => p.last_visit && (Date.now() - new Date(p.last_visit).getTime()) > 180 * 86400000).length;
    return { total: patients.length, upcoming, totalDues, inactive };
  }, [patients]);

  if (showAdd) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center pt-4">
            <AddPatientForm
              onSuccess={() => { setShowAdd(false); fetchPatients(); }}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <main className="max-w-[1480px] mx-auto px-6 py-6 pb-16">

        {/* Page header */}
        <div className="flex items-end gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Patients</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              {loading ? '—' : `${filtered.length} of ${patients.length} records`} ·{' '}
              <span className="text-blue-600 dark:text-blue-400 font-bold">{clinicInfo?.clinic_name || 'Clinic'}</span>
            </p>
          </div>
        </div>

        {/* Stat strip */}
        {!loading && (
          <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              { label: 'Total patients', val: stats.total, sub: null, color: 'blue', icon: <IcUsers /> },
              { label: 'Upcoming appointments', val: stats.upcoming, sub: null, color: 'green', icon: <IcCal /> },
              { label: 'Total outstanding', val: `₹${Math.round(stats.totalDues).toLocaleString('en-IN')}`, sub: null, color: 'red', icon: <IcRupee /> },
              { label: 'Inactive 6+ months', val: stats.inactive, sub: null, color: 'amber', icon: <IcAlert /> },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-default hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0
                  ${s.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
                  ${s.color === 'green' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : ''}
                  ${s.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : ''}
                  ${s.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : ''}
                `}>{s.icon}</div>
                <div className="min-w-0">
                  <div className="text-[19px] font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">{s.val}</div>
                  <div className="text-[11px] text-gray-400 font-semibold mt-1 truncate">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Panel */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">

          {/* Toolbar */}
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5 flex-wrap">
            {/* Segments */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {SEGMENTS.map(s => (
                <button key={s.id} onClick={() => setSegment(s.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold rounded-full border transition-all
                    ${segment === s.id
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {s.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />}
                  {s.label}
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full
                    ${segment === s.id ? 'bg-white/20 dark:bg-black/20 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {segmentCounts[s.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-[260px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 pointer-events-none"><IcSearch /></span>
              <input type="text" placeholder="Search by name, ID or phone…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all" />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 text-lg leading-none transition-colors">×</button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-[10px]">
              {([['table', <IcTable />], ['cards', <IcGrid />]] as const).map(([v, icon]) => (
                <button key={v} onClick={() => setViewMode(v as 'table' | 'cards')}
                  className={`w-8 h-8 flex items-center justify-center rounded-[7px] transition-all
                    ${viewMode === v ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  {icon}
                </button>
              ))}
            </div>

            {/* Add patient */}
            <button onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-[9px] transition-colors">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
              Add patient
            </button>
          </div>

          {/* Table / cards */}
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-14 bg-gray-50 dark:bg-gray-800/50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <PatientTable
              patients={filtered}
              onAddClick={() => setShowAdd(true)}
              onDeleteSuccess={fetchPatients}
              viewMode={viewMode}
            />
          )}
        </div>
      </main>
    </div>
  );
}
