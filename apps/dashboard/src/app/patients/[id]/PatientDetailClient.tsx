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
import { useClinic } from '@/context/ClinicContext';

interface XRay {
  url: string;
  name: string;
  date: string;
}

export default function PatientDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { clinic: clinicInfo } = useClinic();
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const debugClinicId = searchParams.get('clinicId');
  const [patientId, setPatientId] = useState<string | null>(null);
  
  const [patient, setPatient] = useState<(Patient & { doctors: { id: number, name: string }[] }) | null>(null);
  const doctors = patient?.doctors || [];
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
    paid: 0,
    xrays: '[]',
    billing_items: []
  });
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);

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
        const resData = await fetch('/api/generate-notes', {
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

    // Combine selected doctors into comma-separated string
    const doctorString = selectedDoctors.join(', ');

    const optimisticVisit: Visit = {
        ...newVisit,
        id: editingVisitId || Math.random() * -1,
        clinic_id: patient.clinic_id || 0,
        patient_id: patient.id,
        date: newVisit.date || new Date().toISOString().split('T')[0],
        doctor: doctorString,
        cost: Number(newVisit.cost) || 0,
        paid: Number(newVisit.paid) || 0,
        billing_items: newVisit.billing_items || [],
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
        const res = await fetch('/api/visits', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...newVisit, 
                doctor: doctorString,
                patient_id: patient.id, 
                id: editingVisitId,
                billing_items: JSON.stringify(newVisit.billing_items || [])
            })
        });
        if (res.ok) {
            const savedVisit = await res.json();
            showToast('Visit saved!', 'success');
            setEditingVisitId(null);
            setActiveVisitId(savedVisit.id);
            setSelectedDoctors([]);
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
    
    // Parse doctors from comma-separated string
    const doctorsList = visit.doctor ? visit.doctor.split(',').map(d => d.trim()).filter(Boolean) : [];
    setSelectedDoctors(doctorsList);
    
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
        paid: Number(visit.paid || 0),
        xrays: visit.xrays || '[]',
        billing_items: visit.billing_items || []
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
                <button onClick={() => setShowEditForm(true)} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Edit Profile</button>
            </div>
        </div>

        {/* Edit Patient Modal */}
        {showEditForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                    <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Edit Patient Profile</h2>
                        <button onClick={() => setShowEditForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Patient Name</label>
                            <input 
                                type="text" 
                                value={editPatient.name || ''} 
                                onChange={e => setEditPatient(prev => ({...prev, name: e.target.value}))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Enter patient name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Age</label>
                                <input 
                                    type="number" 
                                    value={editPatient.age || ''} 
                                    onChange={e => setEditPatient(prev => ({...prev, age: Number(e.target.value)}))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Age"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gender</label>
                                <select 
                                    value={editPatient.gender || ''} 
                                    onChange={e => setEditPatient(prev => ({...prev, gender: e.target.value}))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                            <input 
                                type="tel" 
                                value={editPatient.phone_number || ''} 
                                onChange={e => setEditPatient(prev => ({...prev, phone_number: e.target.value}))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Patient Type</label>
                            <select 
                                value={editPatient.patient_type || ''} 
                                onChange={e => setEditPatient(prev => ({...prev, patient_type: e.target.value}))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="">Select Type</option>
                                <option value="New">New</option>
                                <option value="Returning">Returning</option>
                            </select>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                        <button 
                            onClick={() => setShowEditForm(false)} 
                            className="px-6 py-3 text-gray-600 dark:text-gray-400 font-bold text-sm uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleUpdatePatient} 
                            className="px-8 py-3 bg-blue-600 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}

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
                {(() => {
                    const totalCost = patient.visits?.reduce((sum, v) => sum + Number(v.cost || 0), 0) || 0;
                    const totalPaid = patient.visits?.reduce((sum, v) => sum + Number(v.paid || 0), 0) || 0;
                    const balance = totalCost - totalPaid;
                    
                    return (
                        <div className="space-y-3">
                            <div>
                                <div className="text-2xl font-black text-green-600 dark:text-green-400">₹{totalPaid.toLocaleString()}</div>
                                <p className="text-[10px] text-gray-500 uppercase mt-0.5">Total Collected</p>
                            </div>
                            {totalCost > 0 && (
                                <>
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Total Cost</span>
                                            <span className="font-semibold">₹{totalCost.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    {balance > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Balance Due</span>
                                            <span className="font-semibold text-red-600 dark:text-red-400">₹{balance.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {balance === 0 && totalCost > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="font-semibold">Fully Paid</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })()}
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
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in slide-in-from-top-4 duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-gray-200 dark:border-gray-800 px-8 py-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">{editingVisitId ? 'Edit Visit Record' : 'New Visit Record'}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Document patient consultation and treatment details</p>
                                </div>
                                <button onClick={handleCloseVisitForm} className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* AI Smart Entry Section */}
                            {!editingVisitId && (
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-900/50 p-6">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <label className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">AI Smart Entry</label>
                                        </div>
                                        <textarea 
                                            value={smartNote} 
                                            onChange={(e) => setSmartNote(e.target.value)} 
                                            placeholder="Describe the visit naturally... e.g., 'Patient came for tooth pain on upper right molar, prescribed amoxicillin 500mg, charged 2000 rupees'"
                                            className="w-full p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none min-h-[120px] transition-all shadow-sm" 
                                        />
                                        <div className="flex justify-between items-center mt-4">
                                            <button 
                                                onClick={() => setShowManualFields(!showManualFields)} 
                                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showManualFields ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                                                </svg>
                                                {showManualFields ? 'Hide Manual Entry' : 'Show Manual Entry'}
                                            </button>
                                            <button 
                                                onClick={handleAIGenerate} 
                                                disabled={isGenerating || !smartNote.trim()} 
                                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/30 disabled:shadow-none transition-all active:scale-95 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Parsing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        Parse with AI
                                                    </>
                                                )}
                                            </button>
                                        </div>
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
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Visit Type</label>
                                            <select value={newVisit.visit_type} onChange={e => setNewVisit(prev => ({...prev, visit_type: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                                                <option value="Consultation">Consultation</option>
                                                <option value="Procedure">Procedure</option>
                                                <option value="Follow-up">Follow-up</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Attending Doctors</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {selectedDoctors.map((doc, idx) => (
                                                <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                                                    <span>{doc}</span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setSelectedDoctors(prev => prev.filter((_, i) => i !== idx))}
                                                        className="hover:text-blue-900 dark:hover:text-blue-100 transition"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <select 
                                            value="" 
                                            onChange={e => {
                                                const doctor = e.target.value;
                                                if (doctor && !selectedDoctors.includes(doctor)) {
                                                    setSelectedDoctors(prev => [...prev, doctor]);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                                        >
                                            <option value="">+ Add Doctor</option>
                                            {doctors.filter(d => !selectedDoctors.includes(d.name)).map(d => (
                                                <option key={d.id} value={d.name}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Clinical Assessment</label>
                                        <textarea value={newVisit.clinical_findings} onChange={e => setNewVisit(prev => ({...prev, clinical_findings: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-32" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Procedure & Notes</label>
                                        <textarea value={newVisit.procedure_notes} onChange={e => setNewVisit(prev => ({...prev, procedure_notes: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-32" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Medicine Prescribed</label>
                                        <textarea value={newVisit.medicine_prescribed} onChange={e => setNewVisit(prev => ({...prev, medicine_prescribed: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-20" placeholder="Medications and dosage instructions..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Total Cost (₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">₹</span>
                                                <input 
                                                    type="number" 
                                                    value={newVisit.cost || ''} 
                                                    onChange={e => {
                                                        const value = e.target.value;
                                                        const cost = value === '' ? 0 : Number(value);
                                                        setNewVisit(prev => ({
                                                            ...prev, 
                                                            cost,
                                                            // Auto-set paid to cost if paid is 0 or not set
                                                            paid: (prev.paid === 0 || !prev.paid) && cost > 0 ? cost : prev.paid
                                                        }));
                                                    }} 
                                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                                    placeholder="Enter amount"
                                                    min="0"
                                                    step="1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Paid Amount (₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">₹</span>
                                                <input 
                                                    type="number" 
                                                    value={newVisit.paid || ''} 
                                                    onChange={e => {
                                                        const value = e.target.value;
                                                        const paid = value === '' ? 0 : Number(value);
                                                        setNewVisit(prev => ({...prev, paid}));
                                                    }} 
                                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                                    placeholder="Enter amount"
                                                    min="0"
                                                    step="1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {newVisit.cost && newVisit.paid !== undefined && newVisit.cost > 0 && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                {newVisit.cost > newVisit.paid ? (
                                                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Balance Due</span>
                                                        </div>
                                                        <span className="text-lg font-black text-amber-700 dark:text-amber-300">₹{(newVisit.cost - newVisit.paid).toLocaleString()}</span>
                                                    </div>
                                                ) : newVisit.cost === newVisit.paid ? (
                                                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">Fully Paid</span>
                                                        </div>
                                                        <span className="text-lg font-black text-green-700 dark:text-green-300">₹{newVisit.cost.toLocaleString()}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                            </svg>
                                                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Overpaid</span>
                                                        </div>
                                                        <span className="text-lg font-black text-blue-700 dark:text-blue-300">+₹{(newVisit.paid - newVisit.cost).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-3">Teeth Involved (Odontogram)</label>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto">
                                        <div className="w-max">
                                            <ToothSelector 
                                                value={newVisit.tooth_number || ''} 
                                                dentitionType={newVisit.dentition_type || 'Adult'}
                                                onDentitionTypeChange={(type) => setNewVisit(prev => ({...prev, dentition_type: type}))}
                                                onChange={(val) => setNewVisit(prev => ({...prev, tooth_number: val}))} 
                                            />
                                        </div>
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
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1">
                                    <h3 className="text-3xl font-black tracking-tight mb-3">{activeVisit.visit_type}</h3>
                                    {activeVisit.doctor && (
                                        <div className="flex flex-wrap gap-2">
                                            {activeVisit.doctor.split(',').map((doc, idx) => (
                                                <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span>{doc.trim()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditVisit(activeVisit)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                    <button onClick={() => activeVisit.id && handleDeleteVisit(activeVisit.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Clinical Assessment</h4>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeVisit.clinical_findings}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Procedure Details</h4>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeVisit.procedure_notes || 'No notes'}</p>
                                </div>
                                {activeVisit.medicine_prescribed && (
                                    <div className="md:col-span-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Prescribed Medication</h4>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeVisit.medicine_prescribed}</p>
                                    </div>
                                )}
                                {activeVisit.tooth_number && (
                                    <div className="md:col-span-2">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Treatment Area</h4>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-950/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
                                        <div className="w-max">
                                            <ToothSelector value={activeVisit.tooth_number} dentitionType={activeVisit.dentition_type} readOnly />
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>

                            {/* Financial Summary - Moved to end */}
                            {(activeVisit.cost || activeVisit.paid) && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400 text-xs">Cost</span>
                                                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">₹{Number(activeVisit.cost || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400 text-xs">Collected</span>
                                                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">₹{Number(activeVisit.paid || 0).toLocaleString()}</span>
                                            </div>
                                            {Number(activeVisit.cost || 0) !== Number(activeVisit.paid || 0) && (
                                                <>
                                                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                                                    <div>
                                                        <span className={`text-xs ${
                                                            Number(activeVisit.cost || 0) > Number(activeVisit.paid || 0)
                                                                ? 'text-amber-600 dark:text-amber-400'
                                                                : 'text-blue-600 dark:text-blue-400'
                                                        }`}>
                                                            {Number(activeVisit.cost || 0) > Number(activeVisit.paid || 0) ? 'Balance' : 'Overpaid'}
                                                        </span>
                                                        <span className={`ml-2 font-semibold ${
                                                            Number(activeVisit.cost || 0) > Number(activeVisit.paid || 0)
                                                                ? 'text-amber-700 dark:text-amber-300'
                                                                : 'text-blue-700 dark:text-blue-300'
                                                        }`}>
                                                            ₹{Math.abs(Number(activeVisit.cost || 0) - Number(activeVisit.paid || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {Number(activeVisit.cost || 0) === Number(activeVisit.paid || 0) && Number(activeVisit.cost || 0) > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="font-medium">Settled</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}