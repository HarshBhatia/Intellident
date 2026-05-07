'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Patient, Visit } from '@/types';
import PatientTable from '@/components/PatientTable';
import AddPatientForm from '@/components/AddPatientForm';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/context/ClinicContext';
import { Appointment } from '@intellident/api';

// ─── Earnings Chart ───────────────────────────────────────────────────────────

function EarningsChart({ visits }: { visits: Visit[] }) {
  const W = 960, H = 200, P = { t: 16, r: 12, b: 28, l: 44 };
  const maxY = 20000;

  // Build last 30 days of collected earnings from visits
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 29 + i);
    return d.toISOString().split('T')[0];
  });

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    visits.forEach(v => {
      if (v.date && map[v.date] !== undefined) map[v.date] += Number(v.paid || 0);
      else if (v.date) map[v.date] = Number(v.paid || 0);
    });
    return map;
  }, [visits]);

  const points = days.map((d, i) => {
    const val = byDay[d] || 0;
    const x = P.l + i * ((W - P.l - P.r) / 29);
    const y = P.t + (H - P.t - P.b) * (1 - Math.min(val, maxY) / maxY);
    return { x, y, val, d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = linePath + ` L ${points[points.length - 1].x} ${H - P.b} L ${P.l} ${H - P.b} Z`;

  return (
    <svg style={{ width: '100%', height: H }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad-earn" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = P.t + (H - P.t - P.b) * (1 - t);
        return (
          <g key={t}>
            <line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="currentColor" strokeWidth="1" className="text-gray-100 dark:text-gray-800" />
            <text x={P.l - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af" fontWeight="600">
              ₹{Math.round(maxY * t / 1000)}k
            </text>
          </g>
        );
      })}
      {[0, 7, 14, 21, 29].map(i => (
        <text key={i} x={points[i].x} y={H - 8} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="600">
          {i === 29 ? 'Today' : days[i].slice(5).replace('-', '/')}
        </text>
      ))}
      <path d={fillPath} fill="url(#grad-earn)" />
      <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2" />
      {points[points.length - 1] && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#2563eb" stroke="#fff" strokeWidth="2" />
      )}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const TREATMENT_COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#94a3b8'];

function DonutChart({ visits }: { visits: Visit[] }) {
  // Derive treatment mix from visit_type
  const counts: Record<string, number> = {};
  visits.forEach(v => {
    const t = v.visit_type || 'Other';
    counts[t] = (counts[t] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, cnt], i) => ({ name, pct: Math.round(cnt / total * 100), color: TREATMENT_COLORS[i] }));

  const R = 52, r = 34, cx = 64, cy = 64;
  // Single segment = full ring (SVG arc can't go start→same point)
  const arcs = items.length === 1
    ? [<g key={items[0].name}>
        <circle cx={cx} cy={cy} r={R} fill={items[0].color} />
        <circle cx={cx} cy={cy} r={r} className="fill-white dark:fill-gray-900" />
      </g>]
    : (() => {
        let acc = 0;
        return items.map(t => {
          const start = acc / 100 * Math.PI * 2 - Math.PI / 2;
          const end = (acc + t.pct) / 100 * Math.PI * 2 - Math.PI / 2;
          acc += t.pct;
          const large = end - start > Math.PI ? 1 : 0;
          const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
          const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
          const x3 = cx + r * Math.cos(end), y3 = cy + r * Math.sin(end);
          const x4 = cx + r * Math.cos(start), y4 = cy + r * Math.sin(start);
          return <path key={t.name} d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`} fill={t.color} />;
        });
      })();

  if (total === 0) return <div className="text-sm text-gray-400 py-4">No visits yet</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
        {arcs}
        <text x="64" y="60" textAnchor="middle" fontSize="20" fontWeight="800" fill="#111827">{total}</text>
        <text x="64" y="76" textAnchor="middle" fontSize="9" fontWeight="600" fill="#9ca3af">visits</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map(t => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
            <span style={{ color: '#111827', fontWeight: 700 }}>{t.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ icon, value, label, trend, trendUp, accent }: {
  icon: React.ReactNode; value: string; label: string;
  trend?: string; trendUp?: boolean; accent: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const accentMap = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20',text: 'text-purple-600 dark:text-purple-400' },
  };
  const { bg, text } = accentMap[accent];
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} ${text}`}>{icon}</div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { clinic: clinicInfo, doctors } = useClinic();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [view, setView] = useState<'list' | 'add'>('list');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [chartSeg, setChartSeg] = useState<'7D' | '30D' | '3M'>('30D');

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.status === 401) { router.push('/sign-in'); return; }
      if (res.ok) setPatients(await res.json());
    } catch { setPatients([]); }
    finally { setLoadingPatients(false); }
  }, [router]);

  const fetchVisits = useCallback(async () => {
    try {
      const res = await fetch('/api/visits');
      if (res.ok) setVisits(await res.json());
    } catch { setVisits([]); }
    finally { setLoadingVisits(false); }
  }, []);

  const fetchTodayAppts = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/appointments?date=${today}`);
      if (res.ok) setTodayAppts(await res.json());
    } catch { setTodayAppts([]); }
  }, []);

  useEffect(() => {
    if (user?.id) {
      Promise.all([fetchPatients(), fetchVisits(), fetchTodayAppts()])
        .then(() => setIsInitialLoad(false));
    }
  }, [user?.id, fetchPatients, fetchVisits, fetchTodayAppts]);

  const filteredPatients = useMemo(() =>
    (patients || []).filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone_number?.includes(searchTerm) ||
      p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [patients, searchTerm]);

  // ── Derived stats ──
  const stats = useMemo(() => {
    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
    const monthVisits = visits.filter(v => v.date?.startsWith(monthStr));
    const revenueMonth = monthVisits.reduce((s, v) => s + Number(v.paid || 0), 0);
    const outstanding = visits.reduce((s, v) => {
      const due = Number(v.cost || 0) - Number(v.paid || 0);
      return s + (due > 0 ? due : 0);
    }, 0);
    const todayStr = now.toISOString().split('T')[0];
    const todayVisits = visits.filter(v => v.date === todayStr).length;
    const recentPatients = [...patients]
      .filter(p => p.last_visit)
      .sort((a, b) => (b.last_visit || '').localeCompare(a.last_visit || ''))
      .slice(0, 5);
    // Doctor performance from visits
    const docMap: Record<string, { visits: number; revenue: number; color: string }> = {};
    const docColors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
    let ci = 0;
    visits.forEach(v => {
      const name = v.doctor || 'Unknown';
      if (!docMap[name]) docMap[name] = { visits: 0, revenue: 0, color: docColors[ci++ % docColors.length] };
      docMap[name].visits++;
      docMap[name].revenue += Number(v.paid || 0);
    });
    const docList = Object.entries(docMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 4)
      .map(([name, d]) => ({ name, ...d }));
    const maxRev = docList[0]?.revenue || 1;
    return { revenueMonth, outstanding, todayVisits, recentPatients, docList, maxRev };
  }, [patients, visits]);

  // Chart visits filtered by segment
  const chartVisits = useMemo(() => {
    const days = chartSeg === '7D' ? 7 : chartSeg === '3M' ? 90 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return visits.filter(v => (v.date || '') >= cutoffStr);
  }, [visits, chartSeg]);

  const userName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Doctor';
  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;

  const APPT_STATUS_COLORS: Record<string, string> = {
    SCHEDULED: '#f59e0b', CONFIRMED: '#16a34a', IN_PROGRESS: '#2563eb',
    COMPLETED: '#9ca3af', CANCELLED: '#dc2626', NO_SHOW: '#ef4444',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 40px' }}>

        {/* No-doctors warning */}
        {doctors !== null && doctors.length === 0 && !isInitialLoad && (
          <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-200">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="flex-1 text-sm font-medium">No doctors added yet. Add a doctor to tag visits correctly.</div>
            <button onClick={() => router.push('/settings?tab=doctors')} className="px-3 py-1 bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg text-xs font-bold hover:bg-amber-200 transition">Add Doctor</button>
          </div>
        )}

        {/* Greeting */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {userName}
            </h1>
            <p className="text-sm text-gray-500">
              Here&apos;s what&apos;s happening at{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">{clinicInfo?.clinic_name || 'your clinic'}</span>{' '}
              today, {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/scheduler')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Schedule
            </button>
            <button onClick={() => setView('add')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              New patient
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KPICard accent="blue" value={isInitialLoad ? '—' : String(patients.length)} label="Total patients"
            icon={<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          />
          <KPICard accent="green" value={isInitialLoad ? '—' : fmt(stats.revenueMonth)} label="Revenue this month"
            icon={<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          />
          <KPICard accent="amber" value={isInitialLoad ? '—' : String(todayAppts.length || stats.todayVisits)} label="Appointments today"
            icon={<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
          />
          <KPICard accent="purple" value={isInitialLoad ? '—' : fmt(stats.outstanding)} label="Outstanding dues"
            trend={stats.outstanding > 0 ? `${fmt(stats.outstanding)} due` : undefined} trendUp={false}
            icon={<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
          />
        </div>

        {/* Earnings + Schedule */}
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 360px' }}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Earnings overview</div>
                <div className="text-xs text-gray-500 mt-0.5">Collections over time</div>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
                {(['7D', '30D', '3M'] as const).map(s => (
                  <button key={s} onClick={() => setChartSeg(s)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${chartSeg === s ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {loadingVisits ? <Skeleton className="h-48 w-full" /> : <EarningsChart visits={chartVisits} />}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div>
                <div className="text-base font-black text-green-600 dark:text-green-400 tracking-tight">{fmt(stats.revenueMonth)}</div>
                <div className="text-xs text-gray-500 mt-0.5">Collected this month</div>
              </div>
              <div>
                <div className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                  {fmt(visits.filter(v => v.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, v) => s + Number(v.cost || 0), 0))}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Total billed</div>
              </div>
              <div>
                <div className="text-base font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {(() => {
                    const billed = visits.filter(v => v.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, v) => s + Number(v.cost || 0), 0);
                    return billed > 0 ? `${Math.round(stats.revenueMonth / billed * 100)}%` : '—';
                  })()}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Collection rate</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Today&apos;s schedule</div>
                <div className="text-xs text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
              </div>
              <button onClick={() => router.push('/scheduler')} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">View calendar →</button>
            </div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wide">Today</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{todayAppts.length} appointments</span>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {todayAppts.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  No appointments today
                </div>
              ) : todayAppts.map((a, i) => {
                const statusColor = APPT_STATUS_COLORS[a.status] || '#9ca3af';
                const isNow = a.status === 'IN_PROGRESS';
                return (
                  <div key={i} className={`flex gap-2.5 p-2.5 rounded-lg mb-1.5 cursor-pointer transition-all border ${isNow ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700'}`}
                    onClick={() => router.push('/scheduler')}>
                    <div style={{ width: 52, textAlign: 'right', flexShrink: 0 }}>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{a.start_time}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{a.end_time}</div>
                    </div>
                    <div style={{ width: 3, borderRadius: 2, background: statusColor, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{a.patient_id ? a.walk_in_name || 'Patient' : a.walk_in_name || 'Walk-in'}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{a.visit_type}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{a.doctor_name}</div>
                    </div>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full self-start" style={{ background: `${statusColor}20`, color: statusColor }}>
                      {isNow ? 'Now' : a.status.toLowerCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3-col row */}
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1.4fr 1fr 1fr' }}>
          {/* Recent patients */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Recent patients</div>
                <div className="text-xs text-gray-500 mt-0.5">Last visited</div>
              </div>
              <button onClick={() => document.getElementById('patients-table')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">All patients →</button>
            </div>
            {loadingPatients ? <Skeleton className="h-40 w-full" /> : stats.recentPatients.length === 0 ? (
              <div className="text-sm text-gray-400 py-4">No patients yet</div>
            ) : stats.recentPatients.map(p => {
              const avatarColor = `hsl(${[...p.name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360}, 60%, 55%)`;
              const initials = p.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
              const due = (p as Patient & { outstanding?: number }).outstanding;
              return (
                <div key={p.patient_id} className="flex items-center gap-2.5 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded-lg px-1 -mx-1 transition"
                  onClick={() => router.push(`/patients/${p.patient_id}`)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: avatarColor }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Last · {p.last_visit || '—'}</div>
                  </div>
                  <div className={`text-xs font-bold ${due && due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {due && due > 0 ? `₹${Number(due).toLocaleString('en-IN')}` : '✓'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Treatment mix */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="mb-3">
              <div className="text-sm font-bold text-gray-900 dark:text-white">Treatment mix</div>
              <div className="text-xs text-gray-500 mt-0.5">By visit type</div>
            </div>
            {loadingVisits ? <Skeleton className="h-32 w-full" /> : <DonutChart visits={visits} />}
          </div>

          {/* Doctor performance */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="mb-3">
              <div className="text-sm font-bold text-gray-900 dark:text-white">Doctor performance</div>
              <div className="text-xs text-gray-500 mt-0.5">Revenue all time</div>
            </div>
            {loadingVisits ? <Skeleton className="h-32 w-full" /> : stats.docList.length === 0 ? (
              <div className="text-sm text-gray-400 py-4">No visit data yet</div>
            ) : stats.docList.map(d => {
              const initials = d.name.split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={d.name} className="flex items-center gap-2.5 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: d.color }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{d.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.visits} visits</div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round(d.revenue / stats.maxRev * 100)}%`, background: `linear-gradient(90deg, #3b82f6, #8b5cf6)` }} />
                    </div>
                  </div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">{fmt(d.revenue)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-8">
          <div className="text-sm font-bold text-gray-900 dark:text-white mb-3">Quick actions</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Add patient', sub: 'New record', color: '#eff6ff', icon_c: '#2563eb', action: () => setView('add'),
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg> },
              { label: 'Schedule', sub: 'Book visit', color: '#fffbeb', icon_c: '#d97706', action: () => router.push('/scheduler'),
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
              { label: 'Earnings', sub: 'Financial report', color: '#f0fdf4', icon_c: '#16a34a', action: () => router.push('/earnings'),
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { label: 'Expenses', sub: 'Track outflow', color: '#fef2f2', icon_c: '#dc2626', action: () => router.push('/expenses'),
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
              { label: 'Settings', sub: 'Clinic config', color: '#f5f3ff', icon_c: '#7c3aed', action: () => router.push('/settings'),
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
              { label: 'Members', sub: 'Team management', color: '#ecfeff', icon_c: '#06b6d4', action: () => router.push('/settings?tab=doctors'),
                icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
            ].map(q => (
              <button key={q.label} onClick={q.action}
                className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl text-left bg-white dark:bg-gray-900 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: q.color, color: q.icon_c }}>{q.icon}</div>
                <div className="text-xs font-bold text-gray-900 dark:text-white">{q.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{q.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Patients table */}
        {view === 'list' ? (
          <div id="patients-table">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Patient Records</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {patients.length} patients · <span className="font-semibold text-blue-600 dark:text-blue-400">{clinicInfo?.clinic_name || 'Clinic'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                <div className="relative flex-1 sm:flex-initial">
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm w-full sm:w-64 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all sm:focus:w-80 placeholder-gray-400"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <button onClick={() => setView('add')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/></svg>
                  Add Patient
                </button>
              </div>
            </div>
            {loadingPatients ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 border-b dark:border-gray-800 flex items-center px-6 gap-4">
                    <Skeleton className="h-4 w-12" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <PatientTable patients={filteredPatients} onAddClick={() => setView('add')} onDeleteSuccess={fetchPatients} />
            )}
          </div>
        ) : (
          <div className="flex justify-center pt-4">
            <AddPatientForm onSuccess={() => { setView('list'); fetchPatients(); }} onCancel={() => setView('list')} />
          </div>
        )}
      </main>
    </div>
  );
}
