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
  const [uploadingXRay, setUploadingXRay] = useState(false);
  const [selectedXRay, setSelectedXRay] = useState<string | null>(null);
  
  useEffect(() => {
    params.then(p => {
      setPatientId(p.id);
      setPatient(null); // Clear previous patient data
      setLoading(true); // Reset loading state
      setActiveVisitId(null);
    });
  }, [params]);

  // Visit Form State
  const [newVisit, setNewVisit] = useState<Partial<Visit>>({
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    visit_type: 'Consultation',
    symptoms: '',
    diagnosis: '',
    treatment_plan: '',
    treatment_done: '',
    tooth_number: '',
    cost: 0,
    notes: ''
  });

  useEffect(() => {
    if (patient?.visits && patient.visits.length > 0) {
        setNewVisit(prev => ({ ...prev, doctor: prev.doctor || patient.visits![0].doctor }));
    }
  }, [patient]);

  const fetchClinicInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/clinic-info');
      if (res.ok) {
        const data = await res.json();
        setClinicInfo(data);
      }
    } catch {
      console.error('Error loading clinic info');
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch {
      console.error('Error loading doctors');
    }
  }, []);

  useEffect(() => {
    fetchClinicInfo();
    fetchDoctors();
  }, [fetchClinicInfo, fetchDoctors]);

  const fetchPatient = useCallback(async () => {
    if (!patientId) return;
    try {
      // If patient is already set, we don't show the full skeleton loading again
      const url = isDebug && debugClinicId 
        ? `/api/debug/patient-details?id=${patientId}&clinicId=${debugClinicId}`
        : `/api/patients/${patientId}`;
        
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPatient(data);
      if (data.visits && data.visits.length > 0 && !activeVisitId) {
        setActiveVisitId(data.visits[0].id);
      }
    } catch (err) {
      showToast('Error loading patient', 'error');
    } finally {
      setLoading(false);
    }
  }, [patientId, activeVisitId, showToast, isDebug, debugClinicId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const handleSaveVisit = async () => {
    if (!patient || !patient.id) return;
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
            showToast(editingVisitId ? 'Visit updated' : 'Visit recorded', 'success');
            setShowVisitForm(false);
            setEditingVisitId(null);
            setActiveVisitId(savedVisit.id);
            fetchPatient(); // Refresh timeline
            // Reset form
            setNewVisit({
                date: new Date().toISOString().split('T')[0],
                doctor: patient.visits?.[0]?.doctor || '',
                visit_type: 'Consultation',
                symptoms: '',
                diagnosis: '',
                treatment_plan: '',
                treatment_done: '',
                tooth_number: '',
                cost: 0,
                notes: ''
            });
        } else {
            showToast('Failed to save visit', 'error');
        }
    } catch {
        showToast('Error', 'error');
    }
  };

  const handleEditVisit = (visit: Visit) => {
    setEditingVisitId(visit.id);
    setNewVisit({
        date: visit.date,
        doctor: visit.doctor,
        visit_type: visit.visit_type || 'Consultation',
        symptoms: visit.symptoms || '',
        diagnosis: visit.diagnosis || '',
        treatment_plan: visit.treatment_plan || '',
        treatment_done: visit.treatment_done || '',
        tooth_number: visit.tooth_number || '',
        cost: Number(visit.cost),
        notes: visit.notes || ''
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
    if (!file || !patient || !patientId) return;

    try {
      setUploadingXRay(true);
      const url = await uploadImage(file);
      if (!url) throw new Error('Upload failed');

      const existingXRays: XRay[] = patient.xrays ? JSON.parse(patient.xrays) : [];
      const newXRay: XRay = {
        url,
        name: file.name,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedXRays = [...existingXRays, newXRay];
      
      // Update DB
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patient, xrays: JSON.stringify(updatedXRays) })
      });

      if (res.ok) {
        showToast('X-Ray uploaded', 'success');
        fetchPatient();
      } else {
        showToast('Failed to update patient records', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading X-Ray', 'error');
    } finally {
      setUploadingXRay(false);
    }
  };

  const handleDeleteXRay = async (index: number) => {
    if (!patient || !patientId || !confirm('Delete this X-Ray?')) return;

    try {
      const existingXRays: XRay[] = patient.xrays ? JSON.parse(patient.xrays) : [];
      const updatedXRays = existingXRays.filter((_, i) => i !== index);

      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patient, xrays: JSON.stringify(updatedXRays) })
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
                            <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                                <span className="text-gray-500 font-medium">Total Amount Paid</span>
                                <span className="text-xl font-black text-green-600">₹{totalPaid.toLocaleString()}</span>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">X-Rays & Records</h2>
                    <label className="cursor-pointer text-blue-600 hover:text-blue-700 transition">
                        <input type="file" className="hidden" accept="image/*" onChange={handleXRayUpload} disabled={uploadingXRay} />
                        {uploadingXRay ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        )}
                    </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {(() => {
                        const xrays: XRay[] = patient.xrays ? JSON.parse(patient.xrays) : [];
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
                    {(!patient.xrays || JSON.parse(patient.xrays).length === 0) && (
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
                                setActiveVisitId(visit.id);
                                setShowVisitForm(false);
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
                            symptoms: '',
                            diagnosis: '',
                            treatment_plan: '',
                            treatment_done: '',
                            tooth_number: '',
                            cost: 0,
                            notes: ''
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
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input type="date" value={newVisit.date || ''} onChange={e => setNewVisit({...newVisit, date: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Doctor</label>
                                <select 
                                    value={newVisit.doctor || ''} 
                                    onChange={e => setNewVisit({...newVisit, doctor: e.target.value})} 
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm bg-white dark:text-white"
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
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Visit Type</label>
                                <select 
                                    value={newVisit.visit_type || 'Consultation'} 
                                    onChange={e => setNewVisit({...newVisit, visit_type: e.target.value})} 
                                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm bg-white dark:text-white"
                                >
                                    <option value="Consultation">Consultation</option>
                                    <option value="Procedure">Procedure</option>
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₹)</label>
                                <input type="number" value={newVisit.cost} onChange={e => setNewVisit({...newVisit, cost: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Diagnosis</label>
                                <input type="text" placeholder="e.g. Dental Caries" value={newVisit.diagnosis || ''} onChange={e => setNewVisit({...newVisit, diagnosis: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Symptoms</label>
                                <input type="text" placeholder="e.g. Pain, Swelling" value={newVisit.symptoms || ''} onChange={e => setNewVisit({...newVisit, symptoms: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Medicine Prescribed</label>
                                <textarea placeholder="Medicines and dosage..." value={newVisit.medicine_prescribed || ''} onChange={e => setNewVisit({...newVisit, medicine_prescribed: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 h-20 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{newVisit.visit_type === 'Procedure' ? 'Treatment Done' : 'Notes / Procedure'}</label>
                                <textarea placeholder="Details..." value={newVisit.treatment_done || ''} onChange={e => setNewVisit({...newVisit, treatment_done: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 h-20 text-sm" />
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {(newVisit.visit_type === 'Consultation' || newVisit.visit_type === 'Procedure') && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Treatment Plan</label>
                                    <textarea placeholder="Planned procedure..." value={newVisit.treatment_plan || ''} onChange={e => setNewVisit({...newVisit, treatment_plan: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 h-20 text-sm" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowVisitForm(false); setEditingVisitId(null); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                            <button type="button" onClick={handleSaveVisit} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
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
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{visit.diagnosis || 'Regular Checkup'}</h3>
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
                                    onClick={() => generatePrescriptionPDF(patient, clinicInfo, visit)}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    Prescription
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleDeleteVisit(visit.id)}
                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition"
                                    title="Delete Visit"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* 2x2 Block for core clinical information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 dark:bg-gray-800/20 p-6 rounded-2xl border dark:border-gray-800">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Diagnosis</h4>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{visit.diagnosis || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Symptoms</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{visit.symptoms || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Medicine Prescribed</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{visit.medicine_prescribed || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Procedure / Notes</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{visit.treatment_done || '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    {visit.treatment_plan && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Treatment Plan</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-800">{visit.treatment_plan}</p>
                                        </div>
                                    )}
                                    
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
