'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { useClinic } from '@/context/ClinicContext';
import ManageMembers from './ManageMembers';

// ─── Icons ────────────────────────────────────────────────────────────────────

const BuildingIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
  </svg>
);
const UsersIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const ClipboardIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const MinusCircleIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M8 12h8" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const BellIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);
const GlobeIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-1.7.85a11 11 0 005.5 5.5l.85-1.7a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.39 21 3 14.61 3 6.5V5z" />
  </svg>
);
const MailIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const PinIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" /><circle cx="12" cy="11" r="3" />
  </svg>
);
const SwitchIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-5 5 5 5M16 17l5-5-5-5M3 12h12M21 12H9" />
  </svg>
);
const ToothIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.5 2h-13C4.1 2 3 4.1 3 6.5c0 2.5 1.5 4.5 3 6v7c0 1.4 1.1 2.5 2.5 2.5h1c1.1 0 2-.9 2-2v-4h1v4c0 1.1.9 2 2 2h1c1.4 0 2.5-1.1 2.5-2.5v-7c1.5-1.5 3-3.5 3-6 0-2.4-1.1-4.5-2.5-4.5z" />
  </svg>
);

// ─── Completeness Ring ────────────────────────────────────────────────────────

function Ring({ pct, size = 44 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth="4" fill="none" className="dark:stroke-gray-700" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#2563eb" strokeWidth="4" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}
        className="text-gray-900 dark:text-gray-100">
        {pct}%
      </div>
    </div>
  );
}

// ─── Side Nav ─────────────────────────────────────────────────────────────────

type SectionId = 'profile' | 'members' | 'treatments' | 'expenses' | 'preferences' | 'export';

const NAV_CLINIC = [
  { id: 'profile' as SectionId, label: 'Clinic Profile', Icon: BuildingIcon },
  { id: 'members' as SectionId, label: 'Clinic Members', Icon: UsersIcon },
  { id: 'treatments' as SectionId, label: 'Treatments', Icon: ClipboardIcon },
  { id: 'expenses' as SectionId, label: 'Expenses', Icon: MinusCircleIcon },
];
const NAV_ACCOUNT = [
  { id: 'preferences' as SectionId, label: 'Preferences', Icon: BellIcon },
  { id: 'export' as SectionId, label: 'Data Export', Icon: DownloadIcon },
];

function SideNav({ active, setActive, memberCount, clinicName }: {
  active: SectionId;
  setActive: (s: SectionId) => void;
  memberCount?: number;
  clinicName?: string;
}) {
  const navBtn = (id: SectionId, label: string, Icon: React.FC) => (
    <button
      key={id}
      onClick={() => setActive(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left border ${
        active === id
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40'
          : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      <span className={active === id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}><Icon /></span>
      <span className="flex-1">{label}</span>
      {id === 'members' && memberCount !== undefined && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active === id ? 'bg-white dark:bg-gray-800 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
          {memberCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 sticky top-20">
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 pt-3 pb-1.5">Clinic</p>
      {NAV_CLINIC.map(({ id, label, Icon }) => navBtn(id, label, Icon))}
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 pt-4 pb-1.5">Account</p>
      {NAV_ACCOUNT.map(({ id, label, Icon }) => navBtn(id, label, Icon))}
      {clinicName && (
        <div className="mt-3 mx-1 mb-1 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-3">
          <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{clinicName}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Active clinic</p>
        </div>
      )}
    </div>
  );
}

// ─── Preview Rail ─────────────────────────────────────────────────────────────

function PreviewRail({ form, pct }: { form: any; pct: number }) {
  const incomplete = pct < 100;
  return (
    <div className="border-l border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-6">
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        Profile completeness <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </p>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 mb-4 flex items-center gap-3">
        <Ring pct={pct} size={52} />
        <div className="text-sm leading-snug">
          {incomplete
            ? <><span className="font-bold text-gray-900 dark:text-gray-100">{Math.ceil((1 - pct / 100) * 7)} fields to go.</span><br /><span className="text-gray-400 dark:text-gray-500 text-xs">Complete profile to enable patient reviews.</span></>
            : <><span className="font-bold text-green-600">All set!</span><br /><span className="text-gray-400 text-xs">Your patient-facing details are ready.</span></>
          }
        </div>
      </div>

      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        Clinic identity <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </p>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
            <ToothIcon />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{form.clinic_name || 'Your clinic name'}</div>
            <div className="text-xs text-gray-400">{form.tagline || 'Add a tagline'}</div>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="text-gray-400 mt-0.5"><PhoneIcon /></span>
            <span>{form.phone ? `+91 ${form.phone}` : <em className="text-gray-300 dark:text-gray-600 not-italic">Add phone</em>}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="text-gray-400 mt-0.5"><MailIcon /></span>
            <span>{form.email || <em className="text-gray-300 dark:text-gray-600 not-italic">Add email</em>}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="text-gray-400 mt-0.5"><PinIcon /></span>
            <span className="leading-relaxed">{form.address || <em className="text-gray-300 dark:text-gray-600 not-italic">Add address</em>}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        Patient review prompt <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </p>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-red-500">G</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Google Reviews</span>
          <span className="text-[10px] text-gray-400 ml-auto">via SMS</span>
        </div>
        <div className="flex gap-0.5 mb-2 text-amber-400">{[0,1,2,3,4].map(i => <StarIcon key={i} />)}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          "Hi! Thanks for visiting <strong>{form.clinic_name || 'your clinic'}</strong>. Tap to leave us a quick review."
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 ${form.google_maps_link ? 'text-green-600' : 'text-amber-500'}`}>
          {form.google_maps_link ? <><CheckIcon /> Review link configured</> : <>! Add Google Maps link to enable</>}
        </div>
      </div>

      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        On the map <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </p>
      <div className="h-28 rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-800"
        style={{ background: 'linear-gradient(135deg,#e8f0ea,#e3eaf3)' }}>
        <div className="absolute inset-0 opacity-40"
          style={{ backgroundImage: 'linear-gradient(90deg,transparent 24%,rgba(150,170,190,.3) 25%,rgba(150,170,190,.3) 26%,transparent 27%),linear-gradient(180deg,transparent 24%,rgba(150,170,190,.3) 25%,rgba(150,170,190,.3) 26%,transparent 27%)', backgroundSize: '36px 36px' }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
            <PinIcon />
          </div>
        </div>
        {form.address && (
          <div className="absolute left-2 right-2 bottom-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-snug">
            {form.address}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Clinic Profile ───────────────────────────────────────────────────────────

function ClinicProfile() {
  const router = useRouter();
  const { showToast } = useToast();
  const { clinic, loading, refreshClinic } = useClinic();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clinic_name: '', tagline: '', owner_name: '', phone: '',
    address: '', email: '', google_maps_link: '', website: '',
    currency: 'INR', timezone: 'Asia/Kolkata',
  });
  const [saved, setSaved] = useState({ ...form });

  useEffect(() => {
    if (clinic) {
      const v = {
        clinic_name: clinic.clinic_name || '',
        tagline: (clinic as any).tagline || '',
        owner_name: clinic.owner_name || '',
        phone: clinic.phone || '',
        address: clinic.address || '',
        email: clinic.email || '',
        google_maps_link: clinic.google_maps_link || '',
        website: (clinic as any).website || '',
        currency: (clinic as any).currency || 'INR',
        timezone: (clinic as any).timezone || 'Asia/Kolkata',
      };
      setForm(v);
      setSaved(v);
    }
  }, [clinic]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const PROFILE_FIELDS = ['clinic_name', 'tagline', 'phone', 'email', 'address', 'google_maps_link', 'website'] as const;
  const filled = PROFILE_FIELDS.filter(f => (form[f] || '').trim().length > 0);
  const pct = Math.round((filled.length / PROFILE_FIELDS.length) * 100);

  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinicId: true }),
      });
      if (res.ok) {
        showToast('Profile updated', 'success');
        setSaved({ ...form });
        await refreshClinic();
      } else {
        showToast('Update failed', 'error');
      }
    } catch { showToast('Update failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleSwitchClinic = async () => {
    if (!confirm('Switch to a different clinic?')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/select-clinic');
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />)}
    </div>
  );

  const Field = ({ label, required, hint, help, children }: {
    label: string; required?: boolean; hint?: string; help?: string; children: React.ReactNode;
  }) => (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-wide">{hint}</span>}
      </label>
      {children}
      {help && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">{help}</p>}
    </div>
  );

  const inputCls = "w-full px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-gray-300 dark:placeholder:text-gray-600";
  const sectionNumCls = "text-[11px] font-black text-gray-300 dark:text-gray-600 font-mono";

  return (
    <>
      {/* Section header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight">Clinic Profile</h2>
          <p className="text-xs text-gray-400 mt-0.5">Identity, contact and presence — shown on patient receipts, SMS and your review page.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Visible to patients
          </span>
          <button onClick={handleSwitchClinic}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 transition">
            <SwitchIcon /> Switch clinic
          </button>
        </div>
      </div>

      {/* Body: form + preview */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="p-6 space-y-7">

          {/* 01 Identity */}
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className={sectionNumCls}>01</span>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Identity</h3>
              <span className="text-xs text-gray-400 ml-auto">How patients recognise you</span>
            </div>

            {/* Logo zone */}
            <div className="flex items-center gap-4 p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-blue-500/20">
                <ToothIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Clinic logo</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Square PNG/SVG, at least 256×256 px. Shows on receipts and the patient review page.</p>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition">Upload</button>
                  <button className="text-xs font-semibold px-3 py-1.5 text-gray-400 hover:text-gray-600 transition">Remove</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Clinic name" required>
                <input value={form.clinic_name} onChange={e => up('clinic_name', e.target.value)}
                  className={inputCls} placeholder="e.g. Bandra Dental Studio" />
              </Field>
              <Field label="Tagline" hint="Optional">
                <input value={form.tagline} onChange={e => up('tagline', e.target.value)}
                  className={inputCls} placeholder="One-line description" />
              </Field>
              <Field label="Owner / head doctor" required
                help="Receives all account-level emails.">
                <input value={form.owner_name} onChange={e => up('owner_name', e.target.value)}
                  className={inputCls} placeholder="Dr. Name" />
              </Field>
              <Field label="Currency">
                <select value={form.currency} onChange={e => up('currency', e.target.value)} className={inputCls}>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="GBP">GBP — Pound (£)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="AED">AED — Dirham</option>
                </select>
              </Field>
            </div>
          </div>

          {/* 02 Contact */}
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className={sectionNumCls}>02</span>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Contact</h3>
              <span className="text-xs text-gray-400 ml-auto">Where patients reach you</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone number">
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-800">
                  <span className="px-3 flex items-center text-sm text-gray-400 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700 font-semibold whitespace-nowrap">🇮🇳 +91</span>
                  <input type="tel" value={form.phone} onChange={e => up('phone', e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm font-medium bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    placeholder="98765 43210" />
                </div>
              </Field>
              <Field label="Email address" required>
                <input type="email" value={form.email} onChange={e => up('email', e.target.value)}
                  className={inputCls} placeholder="clinic@example.com" />
              </Field>
              <Field label="Website" hint="Optional" help="">
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-800">
                  <span className="px-3 flex items-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700 font-semibold">https://</span>
                  <input type="url" value={form.website} onChange={e => up('website', e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm font-medium bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    placeholder="yourdental.com" />
                </div>
              </Field>
              <Field label="Timezone">
                <select value={form.timezone} onChange={e => up('timezone', e.target.value)} className={inputCls}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                </select>
              </Field>
            </div>
          </div>

          {/* 03 Location */}
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className={sectionNumCls}>03</span>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Location</h3>
              <span className="text-xs text-gray-400 ml-auto">Where you operate</span>
            </div>
            <Field label="Clinic address" required help="Used on receipts and the patient review page.">
              <textarea value={form.address} onChange={e => up('address', e.target.value)} rows={3}
                className={inputCls + ' resize-none'} placeholder="Street, area, city, postal code" />
            </Field>
          </div>

          {/* 04 Online Presence */}
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className={sectionNumCls}>04</span>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Online presence</h3>
              <span className="text-xs text-gray-400 ml-auto">Drive reviews and visibility</span>
            </div>
            <Field label="Google Maps review link" hint="Recommended"
              help="Patients see a 'Leave a review' button after every visit.">
              <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-800">
                <span className="px-3 flex items-center text-gray-400 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700"><GlobeIcon /></span>
                <input type="url" value={form.google_maps_link} onChange={e => up('google_maps_link', e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm font-medium bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  placeholder="https://maps.app.goo.gl/..." />
              </div>
            </Field>
          </div>
        </div>

        <PreviewRail form={form} pct={pct} />
      </div>

      {/* Sticky save bar */}
      <div className={`fixed left-0 right-0 bottom-0 z-50 px-6 pb-4 transition-all duration-300 ${dirty ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900 dark:bg-gray-950 text-white rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-2xl shadow-gray-900/40 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]" />
            <div>
              <span className="text-sm font-bold">Unsaved changes</span>
              <span className="text-xs text-gray-400 ml-2">You've edited the clinic profile but haven't saved yet.</span>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setForm({ ...saved })}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition">
                Discard
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 transition disabled:opacity-50 flex items-center gap-1.5">
                {saving ? 'Saving...' : <><CheckIcon /> Save changes</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Manager (Treatments / Expense Categories) ────────────────────────────────

interface Item { id: number; name: string; }

function Manager({ title, apiEndpoint }: { title: string; apiEndpoint: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiEndpoint);
      if (res.ok) setItems(Array.isArray(await res.json()) ? await res.json() : []);
    } catch { showToast(`Failed to load ${title}`, 'error'); }
    finally { setLoading(false); }
  };

  const refetch = async () => {
    try {
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  useEffect(() => { refetch(); setLoading(false); }, [apiEndpoint]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      const res = await fetch(apiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newItem }) });
      if (res.ok) { showToast(`${title} added`, 'success'); setNewItem(''); refetch(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this item?')) return;
    try {
      const res = await fetch(apiEndpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (res.ok) { showToast(`${title} removed`, 'success'); refetch(); }
    } catch {}
  };

  return (
    <>
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage your clinic's {title.toLowerCase()} list.</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{items.length} items</span>
      </div>
      <div className="p-6 space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder={`New ${title.toLowerCase()}…`}
            className="flex-1 px-3 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100" />
          <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">Add</button>
        </form>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-gray-200 transition group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t.name}</span>
                <button onClick={() => handleDelete(t.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Preferences ──────────────────────────────────────────────────────────────

function Preferences() {
  const [notation, setNotation] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('odontogram_notation') || 'FDI';
    return 'FDI';
  });
  const save = (v: string) => { setNotation(v); localStorage.setItem('odontogram_notation', v); };

  return (
    <>
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Preferences</h2>
        <p className="text-xs text-gray-400 mt-0.5">Clinic-wide defaults for your workflow.</p>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 mb-1">Odontogram notation</h3>
          <p className="text-xs text-gray-400 mb-3">Controls how tooth numbers appear across the app.</p>
          <div className="flex gap-2">
            {['FDI', 'Universal', 'Palmer'].map(n => (
              <button key={n} onClick={() => save(n)}
                className={`px-4 py-2 text-sm font-bold rounded-xl border transition ${notation === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Data Export ──────────────────────────────────────────────────────────────

function DataExport() {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const res = await fetch('/api/patients');
      if (!res.ok) throw new Error();
      const patients: any[] = await res.json();
      if (patients.length === 0) { showToast('No data to export', 'error'); return; }

      let blob: Blob, filename: string;
      if (format === 'json') {
        blob = new Blob([JSON.stringify(patients, null, 2)], { type: 'application/json' });
        filename = `intellident_patients_${new Date().toISOString().split('T')[0]}.json`;
      } else {
        const headers = Object.keys(patients[0]).join(',');
        const rows = patients.map(p => Object.values(p).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n');
        blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
        filename = `intellident_patients_${new Date().toISOString().split('T')[0]}.csv`;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      showToast('Export successful', 'success');
    } catch { showToast('Export failed', 'error'); }
    finally { setExporting(false); }
  };

  return (
    <>
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Data Export</h2>
        <p className="text-xs text-gray-400 mt-0.5">Download your records for backup or use in other software.</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          {([['csv', 'CSV Format', 'Best for Excel & Sheets'], ['json', 'JSON Format', 'Best for backups']] as const).map(([fmt, label, sub]) => (
            <button key={fmt} onClick={() => handleExport(fmt)} disabled={exporting}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition group text-left disabled:opacity-50">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
              <DownloadIcon />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clinic } = useClinic();
  const [active, setActive] = useState<SectionId>(
    (searchParams.get('tab') as SectionId) || 'profile'
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('tab') !== active) {
      params.set('tab', active);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [active, router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-2">
            <span>Settings</span>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-600 dark:text-gray-400 font-semibold">
              {[...NAV_CLINIC, ...NAV_ACCOUNT].find(n => n.id === active)?.label}
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Configure how your clinic shows up to patients, staff and the system.</p>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '220px 1fr' }}>
          {/* Sidebar */}
          <div className="min-w-0 w-[220px] flex-shrink-0">
            <SideNav active={active} setActive={setActive} clinicName={clinic?.clinic_name} />
          </div>

          {/* Content card */}
          <div className="min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {active === 'profile' && <ClinicProfile />}
            {active === 'members' && <ManageMembers />}
            {active === 'treatments' && <Manager title="Treatments" apiEndpoint="/api/clinic/treatments" />}
            {active === 'expenses' && <Manager title="Expense Categories" apiEndpoint="/api/expenses/categories" />}
            {active === 'preferences' && <Preferences />}
            {active === 'export' && <DataExport />}
          </div>
        </div>
      </div>
    </div>
  );
}
