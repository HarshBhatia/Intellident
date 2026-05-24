'use client';

import { Patient } from '@/types';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useClinic } from '@/context/ClinicContext';

interface PatientTableProps {
  patients: Patient[];
  onAddClick?: () => void;
  onDeleteSuccess?: () => void;
  viewMode?: 'table' | 'cards';
}

// ─── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#0ea5e9','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0d9488','#f43f5e','#3b82f6'];
function avatarColor(id: string | undefined) {
  if (!id) return AVATAR_COLORS[0];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function fmtDate(d: string | undefined | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysFromToday(d: string | undefined | null): number | null {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000);
}
function relTime(d: string | undefined | null): string {
  const days = daysFromToday(d);
  if (days === null) return '';
  if (days === 0) return 'Today';
  if (days === -1) return 'Yesterday';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return `in ${days} days`;
  if (days < -1 && days > -7) return `${Math.abs(days)}d ago`;
  if (days < 0) {
    const w = Math.round(Math.abs(days) / 7);
    if (w < 5) return `${w}w ago`;
    return `${Math.round(Math.abs(days) / 30)}mo ago`;
  }
  if (days < 30) return `in ${Math.round(days / 7)}w`;
  return `in ${Math.round(days / 30)}mo`;
}
function fmtCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Message modal ────────────────────────────────────────────────────────────
function MessageModal({ patient, clinicName, googleMapsLink, onClose, initialType }: {
  patient: Patient; clinicName: string; googleMapsLink: string;
  onClose: () => void; initialType: 'whatsapp' | 'sms';
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<'reminder' | 'review'>('reminder');
  const [messageType, setMessageType] = useState<'whatsapp' | 'sms'>(initialType);
  const [customMessage, setCustomMessage] = useState('');
  const templates = useMemo(() => ({
    reminder: `Hi ${patient.name}, this is a reminder regarding your visit to ${clinicName || 'our clinic'}.`,
    review: `Hi ${patient.name}, we hope you had a great experience at ${clinicName || 'our clinic'}. We would love it if you could leave us a review on Google: ${googleMapsLink}`
  }), [patient, clinicName, googleMapsLink]);
  useEffect(() => { setCustomMessage(templates[selectedTemplate]); }, [selectedTemplate, templates]);

  const handleSend = () => {
    const phone = patient.phone_number?.replace(/\D/g, '');
    if (messageType === 'whatsapp') {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(customMessage)}`, '_blank');
    } else {
      window.location.href = `sms:${patient.phone_number}?&body=${encodeURIComponent(customMessage)}`;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Message Patient</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['whatsapp', 'sms'] as const).map(t => (
              <button key={t} onClick={() => setMessageType(t)}
                className={`flex-1 py-2 rounded-md text-xs font-bold transition ${messageType === t ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                {t === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['reminder', 'review'] as const).map(t => (
              <button key={t} onClick={() => setSelectedTemplate(t)}
                className={`px-3 py-2 rounded-lg text-xs font-bold capitalize ${selectedTemplate === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {t}
              </button>
            ))}
          </div>
          <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] resize-none" />
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition">Cancel</button>
          <button onClick={handleSend} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Send</button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  call: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-1.7.85a11 11 0 005.5 5.5l.85-1.7a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.39 21 3 14.61 3 6.5V5z"/></svg>,
  chat: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  cal: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  more: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>,
  open: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>,
  sort: <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>,
  check: <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  empty: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="M21 21l-4.3-4.3"/></svg>,
  alert: <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2a1 1 0 01.894.553l9 18A1 1 0 0121 22H3a1 1 0 01-.894-1.447l9-18A1 1 0 0112 2zm0 8a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm0 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"/></svg>,
};

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button ref={ref} onClick={onChange}
      className={`w-[17px] h-[17px] rounded-[5px] border flex items-center justify-center flex-shrink-0 transition-all
        ${checked || indeterminate ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-blue-400'}`}>
      {indeterminate ? <span className="w-[9px] h-[2px] bg-white rounded-sm inline-block" /> : checked ? Ic.check : null}
    </button>
  );
}

// ─── Patient cell ─────────────────────────────────────────────────────────────
function PatientCell({ p }: { p: Patient }) {
  const color = avatarColor(p.patient_id);
  const isMinor = p.age !== undefined && p.age < 18;
  const isMale = p.gender?.toLowerCase() === 'm' || p.gender?.toLowerCase() === 'male';
  const isFemale = p.gender?.toLowerCase() === 'f' || p.gender?.toLowerCase() === 'female';
  const isNew = !p.last_visit;

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
          style={{ background: color }}>
          {initials(p.name)}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">{p.name}</span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{p.patient_id}</span>
          {isNew && <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">New</span>}
          {isMinor && <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">Minor</span>}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
          <span className={isMale ? 'text-blue-500' : isFemale ? 'text-pink-500' : 'text-gray-400'}>
            {isFemale ? 'Female' : isMale ? 'Male' : p.gender || '—'}
          </span>
          {p.age && <><span className="w-[2px] h-[2px] rounded-full bg-slate-300 inline-block" /><span>{p.age} yrs</span></>}
        </div>
      </div>
    </div>
  );
}

// ─── Visit cells ──────────────────────────────────────────────────────────────
function LastVisitCell({ d }: { d: string | undefined | null }) {
  if (!d) return <span className="text-[11px] text-gray-300 dark:text-gray-600 italic">No visits</span>;
  const overdue = (daysFromToday(d) ?? 0) < -180;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{fmtDate(d)}</span>
      <span className={`text-[11px] font-medium ${overdue ? 'text-amber-500 font-semibold' : 'text-gray-400'}`}>{relTime(d)}</span>
    </div>
  );
}

function NextVisitCell({ d }: { d: string | undefined | null }) {
  if (!d) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">{fmtDate(d)}</span>
      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
        {relTime(d)}
      </span>
    </div>
  );
}

// ─── Balance cell ─────────────────────────────────────────────────────────────
function BalanceCell({ p }: { p: Patient }) {
  const balance = p.balance ?? 0;
  const lifetime = p.lifetime_value ?? 0;
  return (
    <div className="text-right font-mono text-[13px] font-bold">
      <span className={balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'}>
        {fmtCurrency(balance)}
      </span>
      {lifetime > 0 && <div className="text-[10px] font-sans font-medium text-gray-400 mt-0.5">{fmtCurrency(lifetime)} lifetime</div>}
    </div>
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────
function RowActions({ p, onMessage, onOpen }: { p: Patient; onMessage: () => void; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
      {p.phone_number && (
        <button title="Call" onClick={e => { e.stopPropagation(); window.location.href = `tel:${p.phone_number}`; }}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
          {Ic.call}
        </button>
      )}
      <button title="Message" onClick={e => { e.stopPropagation(); onMessage(); }}
        className="w-[30px] h-[30px] flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
        {Ic.chat}
      </button>
      <button title="Schedule" onClick={e => { e.stopPropagation(); }}
        className="w-[30px] h-[30px] flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
        {Ic.cal}
      </button>
      <button title="Open patient" onClick={e => { e.stopPropagation(); onOpen(); }}
        className="w-[30px] h-[30px] flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
        {Ic.open}
      </button>
    </div>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────
type SortKey = 'name' | 'last_visit' | 'next_visit' | 'balance';

function SortTh({ label, col, sort, setSort, align }: {
  label: string; col: SortKey; sort: { key: SortKey; dir: 'asc' | 'desc' };
  setSort: (s: { key: SortKey; dir: 'asc' | 'desc' }) => void; align?: string;
}) {
  const active = sort.key === col;
  return (
    <th className={`px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.06em] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-pointer select-none whitespace-nowrap hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${align === 'right' ? 'text-right' : ''}`}
      style={{ textAlign: align as any }}
      onClick={() => setSort({ key: col, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}>
      {label}
      <span className={`ml-1 inline-block transition-transform ${active ? 'opacity-100 text-blue-600' : 'opacity-40'} ${active && sort.dir === 'desc' ? 'rotate-180' : ''}`}>
        {Ic.sort}
      </span>
    </th>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────
function CardView({ rows, onMessage, onOpen }: { rows: Patient[]; onMessage: (p: Patient) => void; onOpen: (p: Patient) => void }) {
  if (rows.length === 0) return (
    <div className="p-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center mx-auto mb-3">{Ic.empty}</div>
      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">No patients match</p>
      <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter.</p>
    </div>
  );
  return (
    <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))' }}>
      {rows.map(p => (
        <div key={p.id} onClick={() => onOpen(p)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-100/50 dark:-translate-y-0 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-sm flex-shrink-0"
              style={{ background: avatarColor(p.patient_id) }}>
              {initials(p.name)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{p.name}</span>
                <span className="text-[10px] font-bold font-mono bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{p.patient_id}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {p.gender} · {p.age ? `${p.age} yrs` : '—'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 py-2.5 border-t border-b border-gray-100 dark:border-gray-800 text-[11px] mb-3">
            <div><span className="text-gray-400 mr-1">Phone</span><span className="font-mono font-bold text-gray-600 dark:text-gray-400">{p.phone_number || '—'}</span></div>
            <div><span className="text-gray-400 mr-1">Last</span><span className="font-bold text-gray-700 dark:text-gray-300">{fmtDate(p.last_visit) || '—'}</span></div>
            <div><span className="text-gray-400 mr-1">Next</span><span className="font-bold text-blue-600">{fmtDate(p.next_visit) || '—'}</span></div>
            <div><span className="text-gray-400 mr-1">Due</span><span className={`font-bold font-mono ${(p.balance ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>{fmtCurrency(p.balance ?? 0)}</span></div>
          </div>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {p.phone_number && <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">{Ic.call}</button>}
            <button onClick={() => onMessage(p)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">{Ic.chat}</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">{Ic.cal}</button>
            <div className="flex-1" />
            <button onClick={() => onOpen(p)} className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">{Ic.open}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PatientTable({ patients, onAddClick, onDeleteSuccess, viewMode = 'table' }: PatientTableProps) {
  const router = useRouter();
  const { clinic } = useClinic();
  const [activeModal, setActiveModal] = useState<{ patient: Patient; type: 'whatsapp' | 'sms' } | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'last_visit', dir: 'desc' });
  const [selected, setSelected] = useState(new Set<number>());
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Reset page when patient list changes (search/filter from parent)
  useEffect(() => { setPage(1); }, [patients.length]);

  const sorted = useMemo(() => {
    const arr = [...patients];
    arr.sort((a, b) => {
      let av: any, bv: any;
      if (sort.key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sort.key === 'last_visit') { av = a.last_visit ? new Date(a.last_visit).getTime() : 0; bv = b.last_visit ? new Date(b.last_visit).getTime() : 0; }
      else if (sort.key === 'next_visit') { av = a.next_visit ? new Date(a.next_visit).getTime() : 0; bv = b.next_visit ? new Date(b.next_visit).getTime() : 0; }
      else if (sort.key === 'balance') { av = a.balance ?? 0; bv = b.balance ?? 0; }
      else { av = 0; bv = 0; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [patients, sort]);

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleRow = (id: number) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(r => r.id!).filter(Boolean)));
  };
  const allSelected = paged.length > 0 && selected.size === paged.length;
  const indeterminate = selected.size > 0 && selected.size < paged.length;

  const openPatient = (p: Patient) => router.push(`/patients/${p.patient_id}`);
  const googleMapsLink = clinic?.google_maps_link || '';

  const thBase = "px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.06em] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 whitespace-nowrap border-b border-gray-100 dark:border-gray-800";

  return (
    <>
      {/* View toggle */}
      <div className="flex items-center gap-1 p-2 absolute right-3 top-3">
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="px-4 py-2.5 bg-gray-900 dark:bg-gray-950 text-white flex items-center gap-3 text-sm border-b border-gray-700">
          <span className="font-bold">{selected.size} selected</span>
          <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 flex items-center gap-1.5 transition">{Ic.chat} Message</button>
          <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 flex items-center gap-1.5 transition">{Ic.cal} Schedule</button>
          <div className="ml-auto">
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition">Clear</button>
          </div>
        </div>
      )}

      {/* Body */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thBase} w-9 pl-4`}>
                  <Checkbox checked={allSelected} indeterminate={indeterminate} onChange={toggleAll} />
                </th>
                <th className={thBase} style={{ paddingLeft: '14px' }}>Patient</th>
                <th className={thBase}>Contact</th>
                <SortTh label="Last visit" col="last_visit" sort={sort} setSort={setSort} />
                <SortTh label="Next visit" col="next_visit" sort={sort} setSort={setSort} />
                <SortTh label="Outstanding" col="balance" sort={sort} setSort={setSort} align="right" />
                <th className={thBase} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {paged.map(p => (
                <tr key={p.id}
                  className={`group/row cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40 ${selected.has(p.id!) ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`}
                  onClick={() => openPatient(p)}>
                  <td className="pl-4 py-3.5 w-9" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(p.id!)} onChange={() => toggleRow(p.id!)} />
                  </td>
                  <td className="px-3.5 py-3.5"><PatientCell p={p} /></td>
                  <td className="px-3.5 py-3.5">
                    {p.phone_number
                      ? <span className="font-mono text-[12.5px] font-semibold text-gray-700 dark:text-gray-300">{p.phone_number}</span>
                      : <span className="text-[12px] italic text-gray-300 dark:text-gray-600">No number</span>
                    }
                  </td>
                  <td className="px-3.5 py-3.5"><LastVisitCell d={p.last_visit} /></td>
                  <td className="px-3.5 py-3.5"><NextVisitCell d={p.next_visit} /></td>
                  <td className="px-3.5 py-3.5"><BalanceCell p={p} /></td>
                  <td className="px-3.5 py-3.5 w-[130px]">
                    <div onClick={e => e.stopPropagation()}>
                      <RowActions p={p}
                        onMessage={() => setActiveModal({ patient: p, type: 'whatsapp' })}
                        onOpen={() => openPatient(p)} />
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-400 flex items-center justify-center mx-auto mb-3">{Ic.empty}</div>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">No patients match</p>
                    <p className="text-xs text-gray-400">Try clearing your search or filters.</p>
                    {onAddClick && <button onClick={onAddClick} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">Add First Patient</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <CardView rows={paged} onMessage={p => setActiveModal({ patient: p, type: 'whatsapp' })} onOpen={openPatient} />
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 bg-gray-50/80 dark:bg-gray-800/30 text-xs text-gray-400">
        <span>Showing <strong className="text-gray-700 dark:text-gray-300">{paged.length}</strong> of <strong className="text-gray-700 dark:text-gray-300">{sorted.length}</strong> patients</span>
        {totalPages > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
              className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 text-sm font-bold bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition">‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-7 h-7 rounded-md border text-xs font-bold transition ${n === page ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
              className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 text-sm font-bold bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition">›</button>
          </div>
        )}
      </div>

      {activeModal && (
        <MessageModal patient={activeModal.patient} initialType={activeModal.type}
          clinicName={clinic?.clinic_name || 'Clinic'} googleMapsLink={googleMapsLink}
          onClose={() => setActiveModal(null)} />
      )}
    </>
  );
}
