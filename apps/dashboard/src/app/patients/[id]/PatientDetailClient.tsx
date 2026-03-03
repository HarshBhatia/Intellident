'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Patient, Visit } from '@/types';
import { useToast } from '@/components/ToastProvider';
import Skeleton from '@/components/Skeleton';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { generatePrescriptionPDF } from '@/lib/pdf-generator';
import { uploadImage } from '@/lib/image-utils';
import { useAuth } from '@/hooks/useAuth';
import ToothSelector from '@/components/ToothSelector';

interface XRay {
  url: string;
  name: string;
  date: string;
}

interface ClinicInfo {
  clinic_name: string;
  owner_name: string;
  phone: string;
  address: string;
  email: string;
  google_maps_link?: string;
}

export default function PatientDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const debugClinicId = searchParams.get('clinicId');
  const [patientId, setPatientId] = useState<string | null>(null);
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [doctors, setDoctors] = useState<{ id: number, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [activeVisitId, setActiveVisitId] = useState<number | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [showEditForm, setShowEditForm] = useState(searchParams.get('edit') === 'true');
  const [uploadingXRay, setUploadingXRay] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showManualFields, setShowManualFields] = useState(false);
  const [selectedXRay, setSelectedXRay] = useState<string | null>(null);
  const [smartNote, setSmartNote] = useState('');

  // Visit Form State
  const [newVisit, setNewVisit] = useState<Partial<Visit>>({
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    visit_type: 'Consultation',
    clinical_findings: '',
    procedure_notes: '',
    tooth_number: '',
    dentition_type: 'Adult',
    cost: 0,
    xrays: '[]'
  });

  // Navigation Guard
  const isFormDirty = useMemo(() => {
    if (!showVisitForm) return false;
    return !!(
      smartNote.trim() || 
      newVisit.clinical_findings?.trim() || 
      newVisit.procedure_notes?.trim() || 
      newVisit.medicine_prescribed?.trim() ||
      (newVisit.cost && newVisit.cost > 0)
    );
  }, [showVisitForm, smartNote, newVisit]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  const handleCloseVisitForm = useCallback(() => {
    if (isFormDirty) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setShowVisitForm(false);
    setEditingVisitId(null);
    setSmartNote('');
  }, [isFormDirty]);

  useEffect(() => {
    params.then(p => setPatientId(p.id));
  }, [params]);

  useEffect(() => {
    setShowEditForm(searchParams.get('edit') === 'true');
  }, [searchParams]);

  // Edit Form State
  const [editPatient, setEditPatient] = useState<Partial<Patient>>({});

  useEffect(() => {
    if (patient) {
        setEditPatient({
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            phone_number: patient.phone_number,
            patient_type: patient.patient_type
        });
    }
  }, [patient]);

  const handleAIGenerate = async () => {
    if (!smartNote.trim()) {
        showToast('Please enter a note first', 'error');
        return;
    }

    try {
        setIsGenerating(true);
        const res = await fetch('/api/generate-notes/');
        const resData = await fetch('/api/generate-notes/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: smartNote })
        });

        if (resData.ok) {
            const data = await resData.json();
            let detectedDentition: 'Adult' | 'Child' = 'Adult';
            if (data.tooth_number && /[A-E]/i.test(data.tooth_number)) {
                detectedDentition = 'Child';
            }

            setNewVisit(prev => ({
                ...prev,
                clinical_findings: data.clinical_findings || prev.clinical_findings,
                procedure_notes: data.procedure_notes || prev.procedure_notes,
                medicine_prescribed: data.medicine_prescribed || prev.medicine_prescribed,
                tooth_number: data.tooth_number || prev.tooth_number,
                visit_type: data.visit_type || prev.visit_type,
                dentition_type: detectedDentition,
                cost: data.cost || prev.cost
            }));
            setShowManualFields(true);
            showToast('Note parsed successfully!', 'success');
            setSmartNote('');
        }
    } catch {
        showToast('Error connecting to AI service', 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  const fetchPatient = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/patients/${patientId}/`);
      if (!res.ok) throw new Error('Failed to fetch patient');
      const data = await res.json();
      setPatient(data);
      if (data.visits && data.visits.length > 0) {
        setActiveVisitId(currentId => currentId || data.visits[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading patient', 'error');
    } finally {
      setLoading(false);
    }
  }, [patientId, showToast]); 

  const fetchInitialData = useCallback(async () => {
    try {
      const [infoRes, docsRes] = await Promise.all([
        fetch('/api/clinic-info/'),
        fetch('/api/doctors/')
      ]);
      if (infoRes.ok) setClinicInfo(await infoRes.json());
      if (docsRes.ok) setDoctors(await docsRes.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (user?.id) fetchInitialData();
  }, [user?.id, fetchInitialData]);

  useEffect(() => {
    if (user?.id && patientId) fetchPatient();
  }, [user?.id, patientId, fetchPatient]);

  const handleUpdatePatient = async () => {
    if (!patientId) return;
    try {
        const res = await fetch(`/api/patients/${patientId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editPatient)
        });
        if (res.ok) {
            showToast('Patient updated successfully!', 'success');
            setShowEditForm(false);
            fetchPatient();
        }
    } catch {
        showToast('Error updating patient', 'error');
    }
  };

  const handleSaveVisit = async () => {
    if (!patient || !patient.id) return;
    if (!newVisit.clinical_findings?.trim()) {
        showToast('Clinical findings are required', 'error');
        return;
    }

    const optimisticVisit: Visit = {
        ...newVisit,
        id: editingVisitId || Math.random() * -1,
        clinic_id: patient.clinic_id || 0,
        patient_id: patient.id,
        date: newVisit.date || new Date().toISOString().split('T')[0],
        cost: Number(newVisit.cost) || 0,
        paid: Number(newVisit.cost) || 0,
        billing_items: [],
        created_at: new Date().toISOString()
    } as Visit;

    const previousPatient = { ...patient };
    setPatient(prev => {
        if (!prev) return prev;
        const visits = prev.visits ? [...prev.visits] : [];
        if (editingVisitId) {
            const index = visits.findIndex(v => v.id === editingVisitId);
            if (index !== -1) visits[index] = optimisticVisit;
        } else {
            visits.unshift(optimisticVisit);
        }
        return { ...prev, visits };
    });
    setShowVisitForm(false);

    try {
        setIsSaving(true);
        const method = editingVisitId ? 'PUT' : 'POST';
        const res = await fetch('/api/visits/', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newVisit, patient_id: patient.id, id: editingVisitId })
        });
        if (res.ok) {
            const savedVisit = await res.json();
            showToast('Visit saved!', 'success');
            setEditingVisitId(null);
            setActiveVisitId(savedVisit.id);
            fetchPatient();
        } else {
            setPatient(previousPatient);
            setShowVisitForm(true);
        }
    } catch {
        setPatient(previousPatient);
        setShowVisitForm(true);
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditVisit = (visit: Visit) => {
    if (!visit.id) return;
    setEditingVisitId(visit.id);
    setShowManualFields(true);
    setNewVisit({
        date: visit.date,
        doctor: visit.doctor,
        visit_type: visit.visit_type || 'Consultation',
        clinical_findings: visit.clinical_findings || '',
        procedure_notes: visit.procedure_notes || '',
        tooth_number: visit.tooth_number || '',
        medicine_prescribed: visit.medicine_prescribed || '',
        dentition_type: visit.dentition_type || 'Adult',
        cost: Number(visit.cost),
        xrays: visit.xrays || '[]'
    });
    setShowVisitForm(true);
  };

  const handleDeleteVisit = async (visitId: number) => {
    if (!confirm('Delete this visit record?')) return;
    try {
        const res = await fetch(`/api/visits/?id=${visitId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Visit deleted', 'success');
            fetchPatient();
        }
    } catch {
        showToast('Error', 'error');
    }
  };

  const activeVisit = useMemo(() => patient?.visits?.find(v => v.id === activeVisitId), [patient?.visits, activeVisitId]);
  const xrays: XRay[] = useMemo(() => {
      try { return activeVisit?.xrays ? JSON.parse(activeVisit.xrays) : []; } catch { return []; }
  }, [activeVisit]);

  const handleFormXRayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingXRay(true);
      const url = await uploadImage(file);
      if (url) {
          const currentXRays = newVisit.xrays ? JSON.parse(newVisit.xrays) : [];
          setNewVisit(prev => ({ ...prev, xrays: JSON.stringify([...currentXRays, { url, name: file.name, date: new Date().toISOString().split('T')[0] }]) }));
      }
    } finally { setUploadingXRay(false); }
  };

  const formatNaturalDate = (dateStr: string) => {
    try { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)); }
    catch { return dateStr; }
  };

  if (loading || !patient) return <div className="p-8"><Skeleton className="h-10 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar activePage="Patient Details" />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumbs */}
        <div className="mb-4">
            <Link href="/" onClick={(e) => { if (isFormDirty && !confirm('Discard changes?')) e.preventDefault(); }} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Patients
            </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-3xl font-bold capitalize">{patient.name}</h1>
                <p className="text-sm text-gray-500 font-mono">ID: {patient.patient_id}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowEditForm(true)} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold shadow-sm">Edit Profile</button>
            </div>
        </div>

        {/* Row 1: Patient Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Patient Info</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{patient.phone_number || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Age</span><span className="font-medium">{patient.age}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Gender</span><span className="font-medium">{patient.gender}</span></div>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Finances</h2>
                <div className="text-2xl font-black">₹{(patient.visits?.reduce((sum, v) => sum + Number(v.paid || 0), 0) || 0).toLocaleString()}</div>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Total Collected</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Attached Records</h2>
                <div className="grid grid-cols-4 gap-2">
                    {xrays.map((x, i) => (
                        <img key={i} src={x.url} className="w-full aspect-square object-cover rounded cursor-pointer" onClick={() => setSelectedXRay(x.url)} alt="record" />
                    ))}
                    {xrays.length === 0 && <div className="col-span-4 py-4 text-center text-[10px] text-gray-400 border border-dashed rounded">No records</div>}
                </div>
            </div>
        </div>

        {/* Visit Management */}
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {patient.visits?.map(v => (
                        <button key={v.id} onClick={() => { if (isFormDirty && !confirm('Discard changes?')) return; setActiveVisitId(v.id || null); setShowVisitForm(false); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeVisitId === v.id && !showVisitForm ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                            {formatNaturalDate(v.date)}
                        </button>
                    ))}
                </div>
                <button onClick={() => { if (isFormDirty && !confirm('Discard changes?')) return; setShowVisitForm(true); setEditingVisitId(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs">+ NEW VISIT</button>
            </div>

            <div className="min-h-[400px]">
                {showVisitForm && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900 p-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">{editingVisitId ? 'Edit Visit' : 'New Visit'}</h3>
                            <button onClick={handleCloseVisitForm} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        {!editingVisitId && (
                            <div className="mb-8 p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <label className="block text-[10px] font-black text-blue-600 uppercase mb-2">Smart AI Entry</label>
                                <textarea value={smartNote} onChange={(e) => setSmartNote(e.target.value)} placeholder="Describe the visit in simple words..." className="w-full p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]" />
                                <div className="flex justify-between mt-3">
                                    <button onClick={() => setShowManualFields(!showManualFields)} className="text-[10px] font-bold text-blue-600 uppercase">{showManualFields ? 'Hide Manual Fields' : 'Show Manual Fields'}</button>
                                    <button onClick={handleAIGenerate} disabled={isGenerating || !smartNote.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold disabled:opacity-50">{isGenerating ? 'Parsing...' : 'Parse with AI'}</button>
                                </div>
                            </div>
                        )}

                        {(showManualFields || editingVisitId) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Date</label>
                                            <input type="date" value={newVisit.date} onChange={e => setNewVisit(prev => ({...prev, date: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Doctor</label>
                                            <select value={newVisit.doctor} onChange={e => setNewVisit(prev => ({...prev, doctor: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                                                <option value="">Select Doctor</option>
                                                {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Clinical Assessment</label>
                                        <textarea value={newVisit.clinical_findings} onChange={e => setNewVisit(prev => ({...prev, clinical_findings: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-32" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Visit Type</label>
                                            <select value={newVisit.visit_type} onChange={e => setNewVisit(prev => ({...prev, visit_type: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                                                <option value="Consultation">Consultation</option>
                                                <option value="Procedure">Procedure</option>
                                                <option value="Follow-up">Follow-up</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Amount (₹)</label>
                                            <input type="number" value={newVisit.cost} onChange={e => setNewVisit(prev => ({...prev, cost: Number(e.target.value)}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Procedure & Notes</label>
                                        <textarea value={newVisit.procedure_notes} onChange={e => setNewVisit(prev => ({...prev, procedure_notes: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-32" />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-3">Teeth Involved (Odontogram)</label>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto">
                                        <ToothSelector 
                                            value={newVisit.tooth_number || ''} 
                                            dentitionType={newVisit.dentition_type || 'Adult'}
                                            onDentitionTypeChange={(type) => setNewVisit(prev => ({...prev, dentition_type: type}))}
                                            onChange={(val) => setNewVisit(prev => ({...prev, tooth_number: val}))} 
                                            className="w-max mx-auto"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t dark:border-gray-800">
                            <button onClick={handleCloseVisitForm} className="px-6 py-2 text-gray-500 font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                            <button onClick={handleSaveVisit} disabled={isSaving || !newVisit.clinical_findings?.trim()} className="bg-blue-600 text-white px-10 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Visit'}</button>
                        </div>
                    </div>
                )}

                {!showVisitForm && activeVisit && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden border-l-4 border-blue-500 animate-in fade-in duration-500">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">{activeVisit.doctor}</div>
                                    <h3 className="text-3xl font-black tracking-tight">{activeVisit.visit_type}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditVisit(activeVisit)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                    <button onClick={() => activeVisit.id && handleDeleteVisit(activeVisit.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Clinical Assessment</h4>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeVisit.clinical_findings}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Procedure Details</h4>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeVisit.procedure_notes || 'No notes'}</p>
                                </div>
                                {activeVisit.tooth_number && (
                                    <div className="md:col-span-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Treatment Area</h4>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-950/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-x-auto w-max mx-auto md:mx-0">
                                            <ToothSelector value={activeVisit.tooth_number} dentitionType={activeVisit.dentition_type} readOnly />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}