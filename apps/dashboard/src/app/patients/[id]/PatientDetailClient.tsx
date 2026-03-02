'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Patient, Visit } from '@/types';
import { useToast } from '@/components/ToastProvider';
import Skeleton from '@/components/Skeleton';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { generatePrescriptionPDF } from '@/lib/pdf-generator';
import { uploadImage } from '@/lib/image-utils';
import { useAuth } from '@/hooks/useAuth';

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
  const [selectedXRay, setSelectedXRay] = useState<string | null>(null);
  const [smartNote, setSmartNote] = useState('');

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

  // Visit Form State
  const [newVisit, setNewVisit] = useState<Partial<Visit>>({
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    visit_type: 'Consultation',
    clinical_findings: '',
    procedure_notes: '',
    tooth_number: '',
    cost: 0
  });

  const handleAIGenerate = async () => {
    if (!smartNote.trim()) {
        showToast('Please enter a note first', 'error');
        return;
    }

    try {
        setIsGenerating(true);
        const res = await fetch('/api/generate-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: smartNote })
        });

        if (res.ok) {
            const data = await res.json();
            setNewVisit(prev => ({
                ...prev,
                clinical_findings: data.clinical_findings || prev.clinical_findings,
                procedure_notes: data.procedure_notes || prev.procedure_notes,
                medicine_prescribed: data.medicine_prescribed || prev.medicine_prescribed,
                tooth_number: data.tooth_number || prev.tooth_number,
                visit_type: data.visit_type || prev.visit_type,
                cost: data.cost || prev.cost
            }));
            showToast('Note parsed successfully!', 'success');
            setSmartNote(''); // Clear smart note after parsing
        } else {
            const err = await res.json();
            showToast(err.error || 'AI generation failed', 'error');
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
      const url = isDebug && debugClinicId 
        ? `/api/debug/patient-details?id=${patientId}&clinicId=${debugClinicId}`
        : `/api/patients/${patientId}`;
        
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch patient');
      const data = await res.json();
      setPatient(data);
      
      // Use functional update to avoid activeVisitId dependency
      if (data.visits && data.visits.length > 0) {
        setActiveVisitId(currentId => currentId || data.visits[0].id);
      }
    } catch (err) {
      console.error('Fetch patient error:', err);
      showToast('Error loading patient', 'error');
    } finally {
      setLoading(false);
    }
  }, [patientId, showToast, isDebug, debugClinicId]); 

  const fetchInitialData = useCallback(async () => {
    try {
      const [infoRes, docsRes] = await Promise.all([
        fetch('/api/clinic-info'),
        fetch('/api/doctors')
      ]);
      
      if (infoRes.ok) setClinicInfo(await infoRes.json());
      if (docsRes.ok) setDoctors(await docsRes.json());
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
        fetchInitialData();
    }
  }, [user, fetchInitialData]);

  useEffect(() => {
    if (user && patientId) {
        fetchPatient();
    }
  }, [user, patientId, fetchPatient]);

  // Auto-select doctor if only one exists
  useEffect(() => {
    if (doctors.length === 1) {
        setNewVisit(prev => ({ ...prev, doctor: doctors[0].name }));
    }
  }, [doctors]);

  useEffect(() => {
    if (patient?.visits && patient.visits.length > 0) {
        setNewVisit(prev => ({ ...prev, doctor: prev.doctor || patient.visits![0].doctor }));
    }
  }, [patient]);

  const handleUpdatePatient = async () => {
    if (!patientId) return;
    try {
        const res = await fetch(`/api/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editPatient)
        });
        if (res.ok) {
            showToast('Patient updated successfully!', 'success');
            setShowEditForm(false);
            // Update local state or re-fetch
            fetchPatient();
            // Clear URL param
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        } else {
            const err = await res.json();
            showToast(err.error || 'Failed to update patient', 'error');
        }
    } catch {
        showToast('Error updating patient', 'error');
    }
  };

  const handleSaveVisit = async () => {
    if (!patient || !patient.id) return;
    
    // Mandatory fields validation
    if (!newVisit.date) {
        showToast('Visit date is required', 'error');
        return;
    }
    if (!newVisit.doctor) {
        showToast('Please select a doctor', 'error');
        return;
    }
    if (!newVisit.visit_type) {
        showToast('Visit type is required', 'error');
        return;
    }
    if (newVisit.cost === undefined || newVisit.cost === null || isNaN(newVisit.cost)) {
        showToast('Amount is required', 'error');
        return;
    }

    // Future date validation
    if (newVisit.date && new Date(newVisit.date) > new Date()) {
        showToast('Visit date cannot be in the future', 'error');
        return;
    }

    try {
        const method = editingVisitId ? 'PUT' : 'POST';
        const body = { 
            ...newVisit, 
            paid: newVisit.cost, 
            patient_id: patient.id,
            id: editingVisitId 
        };

        const res = await fetch('/api/visits', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (res.ok) {
            const savedVisit = await res.json();
            showToast(editingVisitId ? 'Visit updated successfully!' : 'New visit recorded!', 'success');
            setShowVisitForm(false);
            setEditingVisitId(null);
            setActiveVisitId(savedVisit.id);
            fetchPatient(); // Refresh timeline
            // Reset form
            setNewVisit({
                date: new Date().toISOString().split('T')[0],
                doctor: patient.visits?.[0]?.doctor || '',
                visit_type: 'Consultation',
                clinical_findings: '',
                procedure_notes: '',
                tooth_number: '',
                            cost: 0
                        });        } else {
            const errorData = await res.json();
            showToast(errorData.error || 'Failed to save visit', 'error');
        }
    } catch {
        showToast('Error', 'error');
    }
  };

  const handleEditVisit = (visit: Visit) => {
    if (!visit.id) return;
    setEditingVisitId(visit.id);
    setNewVisit({
        date: visit.date,
        doctor: visit.doctor,
        visit_type: visit.visit_type || 'Consultation',
        clinical_findings: visit.clinical_findings || '',
        procedure_notes: visit.procedure_notes || '',
        tooth_number: visit.tooth_number || '',
        cost: Number(visit.cost)
    });
    setShowVisitForm(true);
  };

  const handleDeleteVisit = async (visitId: number) => {
    if (!confirm('Are you sure you want to delete this visit record?')) return;
    
    try {
        const res = await fetch(`/api/visits?id=${visitId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Visit deleted', 'success');
            fetchPatient();
        } else {
            showToast('Failed to delete visit', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error', 'error');
    }
  };

  const handleXRayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient || !patientId || !activeVisitId) return;

    const activeVisit = patient.visits?.find(v => v.id === activeVisitId);
    if (!activeVisit) return;

    try {
      setUploadingXRay(true);
      const url = await uploadImage(file);
      if (!url) throw new Error('Upload failed');

      const existingXRays: XRay[] = activeVisit.xrays ? JSON.parse(activeVisit.xrays) : [];
      const newXRay: XRay = {
        url,
        name: file.name,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedXRays = [...existingXRays, newXRay];
      
      // Update Visit in DB
      const res = await fetch('/api/visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeVisit, xrays: JSON.stringify(updatedXRays) })
      });

      if (res.ok) {
        showToast('X-Ray uploaded', 'success');
        fetchPatient();
      } else {
        showToast('Failed to update visit records', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading X-Ray', 'error');
    } finally {
      setUploadingXRay(false);
    }
  };

  const handleDeleteXRay = async (index: number) => {
    if (!patient || !patientId || !activeVisitId || !confirm('Delete this X-Ray?')) return;

    const activeVisit = patient.visits?.find(v => v.id === activeVisitId);
    if (!activeVisit) return;

    try {
      const existingXRays: XRay[] = activeVisit.xrays ? JSON.parse(activeVisit.xrays) : [];
      const updatedXRays = existingXRays.filter((_, i) => i !== index);

      const res = await fetch('/api/visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeVisit, xrays: JSON.stringify(updatedXRays) })
      });

      if (res.ok) {
        showToast('X-Ray removed', 'success');
        fetchPatient();
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'error');
    }
  };

  const formatNaturalDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  if (loading || !patient) return <div className="p-8"><Skeleton className="h-10 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar activePage="Patient Details" />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Edit Patient Modal */}
        {showEditForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Edit Patient Profile</h3>
                        <button onClick={() => {
                            setShowEditForm(false);
                            const newUrl = window.location.pathname;
                            window.history.replaceState({}, '', newUrl);
                        }} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                                <input 
                                    type="text" 
                                    value={editPatient.name || ''} 
                                    onChange={e => setEditPatient({...editPatient, name: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Age</label>
                                    <input 
                                        type="number" 
                                        value={editPatient.age || ''} 
                                        onChange={e => setEditPatient({...editPatient, age: Number(e.target.value)})}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Gender</label>
                                    <select 
                                        value={editPatient.gender || ''} 
                                        onChange={e => setEditPatient({...editPatient, gender: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold appearance-none"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                                <input 
                                    type="text" 
                                    value={editPatient.phone_number || ''} 
                                    onChange={e => setEditPatient({...editPatient, phone_number: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                        <button 
                            onClick={() => {
                                setShowEditForm(false);
                                const newUrl = window.location.pathname;
                                window.history.replaceState({}, '', newUrl);
                            }}
                            className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-xl"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleUpdatePatient}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Breadcrumbs */}
        <div className="mb-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Patients
            </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">{patient.name}</h1>
                <p className="text-sm text-gray-500 font-mono mt-1">ID: {patient.patient_id}</p>
            </div>
        </div>

        {/* Row 1: Patient Info, Financial Overview, X-Rays */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Patient Info</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{patient.phone_number || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Age</span><span className="font-medium">{patient.age}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Gender</span><span className="font-medium">{patient.gender}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total Visits</span><span className="font-medium">{patient.visits?.length || 0}</span></div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Financial Overview</h2>
                <div className="space-y-3 text-sm">
                    {(() => {
                        const totalPaid = patient.visits?.reduce((sum, v) => sum + Number(v.paid || v.cost || 0), 0) || 0;
                        return (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Total Collected</span>
                                <span className="font-bold text-gray-900 dark:text-white text-lg font-mono">₹{totalPaid.toLocaleString()}</span>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">X-Rays & Records</h2>
                    <label className="cursor-pointer text-blue-600 hover:text-blue-700 transition">
                        <input type="file" className="hidden" accept="image/*" onChange={handleXRayUpload} disabled={uploadingXRay || !activeVisitId} />
                        {uploadingXRay ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        )}
                    </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {(() => {
                        const activeVisit = patient.visits?.find(v => v.id === activeVisitId);
                        const xrays: XRay[] = activeVisit?.xrays ? JSON.parse(activeVisit.xrays) : [];
                        return xrays.map((x, i) => (
                            <div key={i} className="relative group aspect-square">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={x.url} 
                                    alt={x.name} 
                                    className="w-full h-full object-cover rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
                                    onClick={() => setSelectedXRay(x.url)}
                                />
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteXRay(i); }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow-sm"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ));
                    })()}
                    {(!patient.visits?.find(v => v.id === activeVisitId)?.xrays || JSON.parse(patient.visits?.find(v => v.id === activeVisitId)?.xrays || '[]').length === 0) && (
                        <div className="col-span-4 py-4 text-center text-[10px] text-gray-400 border border-dashed rounded border-gray-200 dark:border-gray-800">
                            No records attached
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Full Screen Image Modal */}
        {selectedXRay && (
            <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={() => setSelectedXRay(null)}>
                <button className="absolute top-6 right-6 text-white text-4xl">&times;</button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedXRay} alt="X-Ray Full" className="max-w-full max-h-full object-contain shadow-2xl" />
            </div>
        )}

        {/* Row 2: Visit Timeline with Tabs */}
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-fit overflow-x-auto no-scrollbar">
                    {patient.visits?.map((visit) => (
                        <button
                            key={visit.id}
                            type="button"
                            onClick={() => {
                                if (visit.id) {
                                    setActiveVisitId(visit.id);
                                    setShowVisitForm(false);
                                }
                            }}
                            className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all ${
                                activeVisitId === visit.id && !showVisitForm
                                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {formatNaturalDate(visit.date)}
                        </button>
                    ))}
                    {(!patient.visits || patient.visits.length === 0) && (
                        <span className="text-xs text-gray-400 px-4 py-2">No visits</span>
                    )}
                </div>
                
                <button 
                    type="button"
                    onClick={() => {
                        setShowVisitForm(true);
                        setActiveVisitId(null);
                        setEditingVisitId(null);
                        setNewVisit({
                            date: new Date().toISOString().split('T')[0],
                            doctor: patient.visits?.[0]?.doctor || '',
                            visit_type: 'Consultation',
                            clinical_findings: '',
                            procedure_notes: '',
                            tooth_number: '',
                            medicine_prescribed: '',
                            cost: 0
                        });
                    }}
                    className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 transition whitespace-nowrap ${showVisitForm && !editingVisitId ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-950' : ''}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    NEW VISIT
                </button>
            </div>

            <div className="min-h-[400px]">
                {/* New Visit / Edit Form */}
                {showVisitForm && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900 p-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingVisitId ? 'Update Visit Record' : 'Record New Visit'}
                            </h3>
                            <button type="button" onClick={() => { setShowVisitForm(false); setEditingVisitId(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        {!editingVisitId && (
                            <div className="mb-8 p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                                <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Smart AI Entry (Optional)</label>
                                <div className="flex flex-col gap-3">
                                    <textarea 
                                        placeholder="e.g. Scaling done for tooth 17, 18. Patient had pain. Prescribed Amoxicillin. Cost 1500."
                                        value={smartNote}
                                        onChange={(e) => setSmartNote(e.target.value)}
                                        className="w-full p-4 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[80px] placeholder-gray-400 dark:placeholder-gray-400"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAIGenerate}
                                        disabled={isGenerating || !smartNote.trim()}
                                        className="self-end px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                                Parsing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                Parse with AI
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="visit-date" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Date <span className="text-red-500">*</span></label>
                                <input 
                                    id="visit-date"
                                    name="date"
                                    type="date" 
                                    value={newVisit.date || ''} 
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={e => setNewVisit({...newVisit, date: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100" 
                                />
                            </div>
                            <div>
                                <label htmlFor="visit-doctor" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Doctor <span className="text-red-500">*</span></label>
                                <select 
                                    id="visit-doctor"
                                    name="doctor"
                                    value={newVisit.doctor || ''} 
                                    onChange={e => setNewVisit({...newVisit, doctor: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 appearance-none"
                                >
                                    <option value="">Select Doctor</option>
                                    {doctors.map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="visit-type" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Visit Type <span className="text-red-500">*</span></label>
                                <select 
                                    id="visit-type"
                                    name="visit_type"
                                    value={newVisit.visit_type || 'Consultation'} 
                                    onChange={e => setNewVisit({...newVisit, visit_type: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 appearance-none"
                                >
                                    <option value="Consultation">Consultation</option>
                                    <option value="Procedure">Procedure</option>
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="visit-cost" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Amount (₹) <span className="text-red-500">*</span></label>
                                <input 
                                    id="visit-cost"
                                    name="cost"
                                    type="number" 
                                    value={newVisit.cost} 
                                    onChange={e => setNewVisit({...newVisit, cost: Number(e.target.value)})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="visit-findings" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Clinical Findings <span className="text-red-500">*</span></label>
                                <textarea 
                                    id="visit-findings"
                                    name="clinical_findings"
                                    placeholder="e.g. Dental Caries, Pain, Swelling..." 
                                    value={newVisit.clinical_findings || ''} 
                                    onChange={e => setNewVisit({...newVisit, clinical_findings: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 h-24 placeholder-gray-400 dark:placeholder-gray-400" 
                                />
                            </div>
                            <div>
                                <label htmlFor="visit-procedure" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Procedure & Notes</label>
                                <textarea 
                                    id="visit-procedure"
                                    name="procedure_notes"
                                    placeholder="Details of treatment done..." 
                                    value={newVisit.procedure_notes || ''} 
                                    onChange={e => setNewVisit({...newVisit, procedure_notes: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 h-24 placeholder-gray-400 dark:placeholder-gray-400" 
                                />
                            </div>
                            <div>
                                <label htmlFor="visit-medicine" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Medicine Prescribed</label>
                                <textarea 
                                    id="visit-medicine"
                                    name="medicine_prescribed"
                                    placeholder="Medicines and dosage..." 
                                    value={newVisit.medicine_prescribed || ''} 
                                    onChange={e => setNewVisit({...newVisit, medicine_prescribed: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 h-20 placeholder-gray-400 dark:placeholder-gray-400" 
                                />
                            </div>
                            <div className="flex flex-col justify-end pb-4">
                                <label htmlFor="visit-teeth" className="block text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1.5">Teeth Involved</label>
                                <input 
                                    id="visit-teeth"
                                    name="tooth_number"
                                    type="text" 
                                    placeholder="e.g. 17, 18" 
                                    value={newVisit.tooth_number || ''} 
                                    onChange={e => setNewVisit({...newVisit, tooth_number: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400" 
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowVisitForm(false); setEditingVisitId(null); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                            <button 
                                id="save-visit-btn"
                                type="button" 
                                onClick={handleSaveVisit} 
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
                            >
                                {editingVisitId ? 'Update Record' : 'Save Visit'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Visit Content */}
                {!showVisitForm && patient.visits?.filter(v => v.id === activeVisitId).map((visit) => (
                    <div key={visit.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in duration-300">
                        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{visit.clinical_findings || 'Regular Checkup'}</h3>
                                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                        {visit.visit_type || 'Consultation'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    {visit.doctor || 'No doctor assigned'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => handleEditVisit(visit)}
                                    className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 p-2 rounded-lg transition"
                                    title="Edit Visit"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => clinicInfo && generatePrescriptionPDF(patient, clinicInfo, visit)}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition"
                                    disabled={!clinicInfo}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    Prescription
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => visit.id && handleDeleteVisit(visit.id)}
                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition"
                                    title="Delete Visit"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Consolidated clinical information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 dark:bg-gray-800/20 p-6 rounded-2xl border dark:border-gray-800">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Clinical Findings</h4>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-pre-wrap">{visit.clinical_findings || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Procedure & Notes</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{visit.procedure_notes || '-'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Medicine Prescribed</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{visit.medicine_prescribed || '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    {visit.tooth_number && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Teeth Involved</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {visit.tooth_number.split(',').map(t => (
                                                    <span key={t} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-mono text-xs font-bold border border-blue-200 dark:border-blue-800">
                                                        {t.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Visit Finances</h4>
                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-5 space-y-4 border border-blue-100 dark:border-blue-900/30">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 font-medium">Amount Paid</span>
                                                <span className="text-xl font-black text-green-600">₹{Number(visit.paid || visit.cost).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {(!patient.visits || patient.visits.length === 0) && !showVisitForm && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col items-center gap-4 text-gray-400">
                            <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <p className="font-medium">No clinical history found for this patient.</p>
                            <button 
                                onClick={() => setShowVisitForm(true)}
                                className="text-blue-600 font-bold hover:underline"
                            >
                                Record the first visit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
