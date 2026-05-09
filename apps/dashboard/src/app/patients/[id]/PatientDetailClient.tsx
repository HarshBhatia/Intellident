'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Patient, Visit } from '@/types';
import { useToast } from '@/components/ToastProvider';
import Skeleton from '@/components/Skeleton';
import Link from 'next/link';
import { uploadImage } from '@/lib/image-utils';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/context/ClinicContext';
import { Analytics } from '@/lib/analytics';
import VisitsTab from '@/components/VisitsTab';
import OdontogramTab from '@/components/OdontogramTab';

type TabKey = 'overview' | 'visits' | 'odontogram' | 'financials' | 'files';

export default function PatientDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { clinic: clinicInfo } = useClinic();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isDebug = searchParams.get('debug') === 'true';

  const VALID_TABS: TabKey[] = ['overview', 'visits', 'odontogram', 'financials', 'files'];
  const tabFromUrl = searchParams.get('tab') as TabKey | null;

  const [patientId, setPatientId] = useState<string | null>(null);
  const [patient, setPatient] = useState<(Patient & { doctors: { id: number; name: string; user_email: string }[] }) | null>(null);
  const doctors = patient?.doctors || [];
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'visits'
  );

  const setTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Visit form state
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [showEditPatient, setShowEditPatient] = useState(searchParams.get('edit') === 'true');
  const [uploadingXRay, setUploadingXRay] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showManualFields, setShowManualFields] = useState(true);
  const [smartNote, setSmartNote] = useState('');

  const [newVisit, setNewVisit] = useState<Partial<Visit>>({
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    visit_type: 'Consultation',
    clinical_findings: '',
    procedure_notes: '',
    tooth_number: '',
    dentition_type: 'Adult',
    cost: 0,
    paid: 0,
    xrays: '[]',
    billing_items: [],
  });
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Partial<Patient>>({});

  const isFormDirty = useMemo(() => {
    if (!showVisitForm) return false;
    return !!(smartNote.trim() || newVisit.clinical_findings?.trim() || newVisit.procedure_notes?.trim() || (newVisit.cost && newVisit.cost > 0));
  }, [showVisitForm, smartNote, newVisit]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isFormDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isFormDirty]);

  const handleCloseVisitForm = useCallback(() => {
    if (isFormDirty && !confirm('Discard unsaved changes?')) return;
    setShowVisitForm(false);
    setEditingVisitId(null);
    setSmartNote('');
    setShowManualFields(true);
  }, [isFormDirty]);

  useEffect(() => { params.then(p => setPatientId(p.id)); }, [params]);
  useEffect(() => { setShowEditPatient(searchParams.get('edit') === 'true'); }, [searchParams]);
  useEffect(() => {
    if (patient) {
      setEditPatient({ name: patient.name, age: patient.age, gender: patient.gender, phone_number: patient.phone_number, patient_type: patient.patient_type, referral_source: patient.referral_source });
    }
  }, [patient]);

  const fetchPatient = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      if (!res.ok) throw new Error('Failed to fetch patient');
      const data = await res.json();
      setPatient(data);
    } catch (err) {
      console.error(err);
      showToast('Error loading patient', 'error');
    } finally {
      setLoading(false);
    }
  }, [patientId, showToast]);

  useEffect(() => { if (user?.id && patientId) fetchPatient(); }, [user?.id, patientId, fetchPatient]);

  const handleUpdatePatient = async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editPatient) });
      if (res.ok) { showToast('Patient updated!', 'success'); setShowEditPatient(false); fetchPatient(); }
    } catch { showToast('Error updating patient', 'error'); }
  };

  const handleAIGenerate = async () => {
    if (!smartNote.trim()) { showToast('Enter a note first', 'error'); return; }
    try {
      setIsGenerating(true);
      const res = await fetch('/api/generate-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: smartNote }) });
      if (res.ok) {
        const data = await res.json();
        const detectedDentition: 'Adult' | 'Child' = data.tooth_number && /[A-E]/i.test(data.tooth_number) ? 'Child' : 'Adult';
        setNewVisit(prev => ({ ...prev, clinical_findings: data.clinical_findings || prev.clinical_findings, procedure_notes: data.procedure_notes || prev.procedure_notes, medicine_prescribed: data.medicine_prescribed || prev.medicine_prescribed, tooth_number: data.tooth_number || prev.tooth_number, visit_type: data.visit_type || prev.visit_type, dentition_type: detectedDentition, cost: data.cost || prev.cost }));
        Analytics.notesGenerated();
        setShowManualFields(true);
        showToast('Note parsed!', 'success');
        setSmartNote('');
      }
    } catch { showToast('Error connecting to AI', 'error'); }
    finally { setIsGenerating(false); }
  };

  const handleSaveVisit = async () => {
    if (!patient?.id) return;
    if (!newVisit.clinical_findings?.trim()) { showToast('Clinical findings required', 'error'); return; }
    const doctorString = selectedDoctors.join(', ');
    const optimisticVisit: Visit = { ...newVisit, id: editingVisitId || Math.random() * -1, clinic_id: patient.clinic_id || 0, patient_id: patient.id, date: newVisit.date || new Date().toISOString().split('T')[0], doctor: doctorString, cost: Number(newVisit.cost) || 0, paid: Number(newVisit.paid) || 0, billing_items: newVisit.billing_items || [], created_at: new Date().toISOString() } as Visit;
    const prev = { ...patient };
    setPatient(p => {
      if (!p) return p;
      const vs = p.visits ? [...p.visits] : [];
      if (editingVisitId) { const idx = vs.findIndex(v => v.id === editingVisitId); if (idx !== -1) vs[idx] = optimisticVisit; }
      else vs.unshift(optimisticVisit);
      return { ...p, visits: vs };
    });
    setShowVisitForm(false);
    try {
      setIsSaving(true);
      const res = await fetch('/api/visits', { method: editingVisitId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newVisit, doctor: doctorString, patient_id: patient.id, id: editingVisitId, billing_items: JSON.stringify(newVisit.billing_items || []) }) });
      if (res.ok) {
        if (!editingVisitId) Analytics.visitRecorded({ visitType: newVisit.visit_type });
        showToast('Visit saved!', 'success');
        setEditingVisitId(null);
        setSelectedDoctors([]);
        fetchPatient();
      } else { setPatient(prev); setShowVisitForm(true); }
    } catch { setPatient(prev); setShowVisitForm(true); }
    finally { setIsSaving(false); }
  };

  const handleEditVisit = (visit: Visit) => {
    if (!visit.id) return;
    setEditingVisitId(visit.id);
    setShowManualFields(true);
    setSelectedDoctors(visit.doctor ? visit.doctor.split(',').map(d => d.trim()).filter(Boolean) : []);
    setNewVisit({ date: visit.date, doctor: visit.doctor, visit_type: visit.visit_type || 'Consultation', clinical_findings: visit.clinical_findings || '', procedure_notes: visit.procedure_notes || '', tooth_number: visit.tooth_number || '', medicine_prescribed: visit.medicine_prescribed || '', dentition_type: visit.dentition_type || 'Adult', cost: Number(visit.cost), paid: Number(visit.paid || 0), xrays: visit.xrays || '[]', billing_items: visit.billing_items || [] });
    setShowVisitForm(true);
    setTab('visits');
  };

  const handleDeleteVisit = async (visitId: number) => {
    if (!confirm('Delete this visit?')) return;
    try {
      const res = await fetch(`/api/visits?id=${visitId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Visit deleted', 'success'); fetchPatient(); }
    } catch { showToast('Error', 'error'); }
  };

  const handleFormXRayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingXRay(true);
      const url = await uploadImage(file);
      if (url) {
        const cur = newVisit.xrays ? JSON.parse(newVisit.xrays) : [];
        setNewVisit(prev => ({ ...prev, xrays: JSON.stringify([...cur, { url, name: file.name, date: new Date().toISOString().split('T')[0] }]) }));
      }
    } finally { setUploadingXRay(false); }
  };

  const initials = patient?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const totalCost = patient?.visits?.reduce((s, v) => s + Number(v.cost || 0), 0) || 0;
  const totalPaid = patient?.visits?.reduce((s, v) => s + Number(v.paid || 0), 0) || 0;
  const totalDue  = totalCost - totalPaid;

  if (loading || !patient) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] dark:bg-gray-950">
        <div className="max-w-[1280px] mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <Skeleton className="h-4 w-32 mb-4" />
          {/* Header card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-5 mb-4 flex items-center gap-5">
            <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-72" />
            </div>
            <div className="flex gap-2 ml-auto">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-b-0 rounded-t-xl px-3 flex gap-2">
            {[64, 48, 80, 72, 40].map((w, i) => (
              <div key={i} className="py-3.5 px-4">
                <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: w }} />
              </div>
            ))}
          </div>
          {/* Tab content */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-b-xl rounded-tr-xl p-5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'visits', label: 'Visits', count: patient.visits?.length || 0 },
    { key: 'odontogram', label: 'Odontogram' },
    { key: 'financials', label: 'Financials' },
    { key: 'files', label: 'Files' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-[1280px] mx-auto px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600 transition-colors">Patients</Link>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-800 dark:text-gray-200 font-medium">{patient.name}</span>
        </div>

        {/* Patient header card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-5 mb-4 flex items-center gap-5">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xl font-black flex-shrink-0 shadow-sm">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{patient.name}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <span>{patient.patient_id}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span>{patient.gender} · {patient.age} yrs</span>
              {patient.phone_number && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span>{patient.phone_number}</span>
                </>
              )}
              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {patient.patient_type || 'Patient'}
              </span>
              {patient.referral_source && (
                <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {patient.referral_source}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowEditPatient(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit profile
            </button>
            <button
              onClick={() => { setShowVisitForm(true); setEditingVisitId(null); setShowManualFields(true); setSmartNote(''); setNewVisit({ date: new Date().toISOString().split('T')[0], doctor: '', visit_type: 'Consultation', clinical_findings: '', procedure_notes: '', tooth_number: '', dentition_type: 'Adult', cost: 0, paid: 0, xrays: '[]', billing_items: [] }); setSelectedDoctors([]); setTab('visits'); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              New visit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-b-0 rounded-t-xl px-3 gap-0">
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-3.5 text-sm font-semibold border-b-2 -mb-px transition-all flex items-center gap-2 ${
                activeTab === key
                  ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {label}
              {count !== undefined && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content container */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-b-xl rounded-tr-xl p-5">

          {/* ── Overview tab ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Patient info */}
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Patient Info</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Phone',  val: patient.phone_number || '—' },
                    { label: 'Age',    val: patient.age ? `${patient.age} years` : '—' },
                    { label: 'Gender', val: patient.gender || '—' },
                    { label: 'Type',   val: patient.patient_type || '—' },
                    ...(patient.referral_source ? [{ label: 'Source', val: patient.referral_source }] : []),
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Finances */}
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Finances</h3>
                <div className="text-3xl font-black text-green-600 dark:text-green-400 tracking-tight mb-1">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold mb-4">Total collected</div>
                {totalCost > 0 && (
                  <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between"><span className="text-gray-500">Total billed</span><span className="font-semibold">₹{totalCost.toLocaleString('en-IN')}</span></div>
                    {totalDue > 0 && <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="font-semibold text-red-600 dark:text-red-400">₹{totalDue.toLocaleString('en-IN')}</span></div>}
                    {totalDue <= 0 && <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-semibold"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Fully paid</div>}
                  </div>
                )}
              </div>

              {/* Visits summary */}
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Visit Summary</h3>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight mb-1">{patient.visits?.length || 0}</div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold mb-4">Total visits</div>
                {patient.visits && patient.visits.length > 0 && (
                  <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between"><span className="text-gray-500">Last visit</span><span className="font-semibold">{patient.visits[0].date}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Visit type</span><span className="font-semibold">{patient.visits[0].visit_type}</span></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Visits tab ───────────────────────────────────────────────── */}
          {activeTab === 'visits' && (
            <>
              {showVisitForm && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-200">
                    {/* Form header */}
                    <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                      <h3 className="text-base font-black">{editingVisitId ? 'Edit Visit' : 'New Visit'}</h3>
                      <button onClick={handleCloseVisitForm} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                      {/* AI Smart Entry */}
                      {!editingVisitId && (
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <label className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">AI Smart Entry</label>
                          </div>
                          <textarea value={smartNote} onChange={e => setSmartNote(e.target.value)}
                            placeholder="Describe the visit naturally... e.g., 'Patient came for tooth pain on upper right molar, charged 2000 rupees'"
                            className="w-full p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none" />
                          <div className="flex justify-between items-center mt-2.5">
                            <button onClick={() => setShowManualFields(v => !v)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showManualFields ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'} /></svg>
                              {showManualFields ? 'Hide manual fields' : 'Manual entry'}
                            </button>
                            <button onClick={handleAIGenerate} disabled={isGenerating || !smartNote.trim()}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
                              {isGenerating ? (<><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Parsing...</>) : 'Parse with AI'}
                            </button>
                          </div>
                        </div>
                      )}

                      {(showManualFields || editingVisitId) && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Date</label>
                              <input type="date" value={newVisit.date} onChange={e => setNewVisit(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Visit type</label>
                              <select value={newVisit.visit_type} onChange={e => setNewVisit(p => ({ ...p, visit_type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                                <option>Consultation</option><option>Procedure</option><option>Follow-up</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Doctors</label>
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {selectedDoctors.map((d, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
                                  {d}
                                  <button onClick={() => setSelectedDoctors(p => p.filter((_, j) => j !== i))} className="hover:text-blue-900 ml-0.5">
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setDoctorDropdownOpen(o => !o)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-left flex items-center justify-between"
                              >
                                <span className="text-gray-400 dark:text-gray-500">+ Add doctor</span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                              </button>
                              {doctorDropdownOpen && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                                  {doctors.filter(d => !selectedDoctors.includes(d.name)).length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-400">No more doctors</div>
                                  ) : (
                                    doctors.filter(d => !selectedDoctors.includes(d.name)).map(d => (
                                      <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => { setSelectedDoctors(p => [...p, d.name]); setDoctorDropdownOpen(false); }}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col"
                                      >
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.name}</span>
                                        <span className="text-xs text-gray-400">{d.user_email}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Clinical findings</label>
                            <textarea value={newVisit.clinical_findings} onChange={e => setNewVisit(p => ({ ...p, clinical_findings: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-20 resize-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Procedure notes</label>
                            <textarea value={newVisit.procedure_notes} onChange={e => setNewVisit(p => ({ ...p, procedure_notes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-20 resize-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Total cost (₹)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                <input type="number" value={newVisit.cost || ''} onChange={e => { const cost = e.target.value === '' ? 0 : Number(e.target.value); setNewVisit(p => ({ ...p, cost, paid: (p.paid === 0 || !p.paid) && cost > 0 ? cost : p.paid })); }} className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" min="0" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Paid (₹)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                <input type="number" value={newVisit.paid || ''} onChange={e => setNewVisit(p => ({ ...p, paid: e.target.value === '' ? 0 : Number(e.target.value) }))} className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" min="0" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl">
                      <button onClick={handleCloseVisitForm} className="px-4 py-2 text-gray-500 font-semibold text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                      <button onClick={handleSaveVisit} disabled={isSaving || !newVisit.clinical_findings?.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-xs shadow-sm disabled:opacity-50 transition-colors">
                        {isSaving ? 'Saving...' : 'Save visit'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <VisitsTab
                visits={patient.visits || []}
                onNewVisit={() => { setShowVisitForm(true); setEditingVisitId(null); setShowManualFields(true); setSmartNote(''); setNewVisit({ date: new Date().toISOString().split('T')[0], doctor: '', visit_type: 'Consultation', clinical_findings: '', procedure_notes: '', tooth_number: '', dentition_type: 'Adult', cost: 0, paid: 0, xrays: '[]', billing_items: [] }); setSelectedDoctors([]); }}
                onEditVisit={handleEditVisit}
                onDeleteVisit={handleDeleteVisit}
              />
            </>
          )}

          {/* ── Odontogram tab ───────────────────────────────────────────── */}
          {activeTab === 'odontogram' && (
            <OdontogramTab patientId={patient.patient_id} visits={patient.visits || []} />
          )}

          {/* ── Financials stub ──────────────────────────────────────────── */}
          {activeTab === 'financials' && (
            <div className="py-16 text-center text-gray-400">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mx-auto mb-3 text-gray-300 dark:text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-sm font-semibold text-gray-500">Detailed financials coming soon</div>
              <div className="text-xs text-gray-400 mt-1">Total collected: ₹{totalPaid.toLocaleString('en-IN')} · Outstanding: ₹{Math.max(0, totalDue).toLocaleString('en-IN')}</div>
            </div>
          )}

          {/* ── Files stub ───────────────────────────────────────────────── */}
          {activeTab === 'files' && (
            <div className="py-16 text-center text-gray-400">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mx-auto mb-3 text-gray-300 dark:text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="text-sm font-semibold text-gray-500">Files & X-rays</div>
              <div className="text-xs text-gray-400 mt-1">X-rays attached to individual visits appear here</div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Patient Modal */}
      {showEditPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-lg font-black">Edit Patient</h2>
              <button onClick={() => setShowEditPatient(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {[
                { label: 'Full Name', field: 'name', type: 'text', placeholder: 'Patient name' },
                { label: 'Phone', field: 'phone_number', type: 'tel', placeholder: 'Phone number' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={(editPatient as any)[field] || ''} onChange={e => setEditPatient(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Age</label>
                  <input type="number" value={editPatient.age || ''} onChange={e => setEditPatient(p => ({ ...p, age: Number(e.target.value) }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Gender</label>
                  <select value={editPatient.gender || ''} onChange={e => setEditPatient(p => ({ ...p, gender: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Referral source</label>
                <select value={editPatient.referral_source || ''} onChange={e => setEditPatient(p => ({ ...p, referral_source: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select source</option>
                  <option>Google Ads</option><option>Instagram / Social Media</option>
                  <option>Referred by friend or patient</option><option>Walk-in</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowEditPatient(false)} className="px-5 py-2.5 text-gray-500 font-bold text-xs uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleUpdatePatient} className="px-7 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-blue-700 transition-colors">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
