'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/types';
import ToothSelector from '@/components/ToothSelector';
import { useToast } from '@/components/ToastProvider';
import Skeleton from '@/components/Skeleton';
import Navbar from '@/components/Navbar';

interface XRay {
    id: string;
    image: string;
    description: string;
    date: string;
}

interface PaymentRecord {
    id: string;
    date: string;
    amount: number;
    purpose: string;
    mode: string;
}

export default function PatientDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [initialPatient, setInitialPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [xrayList, setXrayList] = useState<XRay[]>([]);
  const [paymentList, setPaymentList] = useState<PaymentRecord[]>([]);
  
  // Lightbox & Zoom State
  const [selectedXray, setSelectedXray] = useState<XRay | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
      amount: '',
      purpose: '',
      mode: 'Cash',
      date: new Date().toISOString().split('T')[0]
  });
  
  const [treatments, setTreatments] = useState<{id: number, name: string}[]>([]);
  const [doctors, setDoctors] = useState<{id: number, name: string}[]>([]);
  
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);
  const [newTreatmentName, setNewTreatmentName] = useState('');

  const isDirty = useMemo(() => {
      if (!patient || !initialPatient) return false;
      return JSON.stringify(patient) !== JSON.stringify(initialPatient);
  }, [patient, initialPatient]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing, isDirty]);

  useEffect(() => {
    params.then(setUnwrappedParams);
  }, [params]);

  useEffect(() => {
      fetch('/api/treatments').then(res => res.json()).then(data => Array.isArray(data) && setTreatments(data));
      fetch('/api/doctors').then(res => res.json()).then(data => Array.isArray(data) && setDoctors(data));
  }, []);

  useEffect(() => {
    if (!unwrappedParams) return;
    
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${unwrappedParams!.id}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        let currentPayments: PaymentRecord[] = [];
        if (data.payments) {
            try {
                currentPayments = JSON.parse(data.payments);
            } catch (e) { console.error(e); }
        } else if (data.amount > 0) {
            currentPayments = [{
                id: 'legacy-1',
                date: data.date || new Date().toISOString().split('T')[0],
                amount: Number(data.amount),
                purpose: data.paid_for || 'Initial Payment',
                mode: data.mode_of_payment || 'Cash'
            }];
        }
        setPaymentList(currentPayments);
        const total = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        data.amount = total;
        setPatient(data);
        setInitialPatient(JSON.parse(JSON.stringify(data)));
        
        if (data.xrays) {
            try {
                const parsed = JSON.parse(data.xrays);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    if (typeof parsed[0] === 'string') {
                        const migrated = parsed.map((img: string) => ({
                            id: Math.random().toString(36).substr(2, 9),
                            image: img,
                            description: '',
                            date: new Date().toISOString().split('T')[0]
                        }));
                        setXrayList(migrated);
                    } else {
                        setXrayList(parsed);
                    }
                }
            } catch (e) { setXrayList([]); }
        }
      } catch (err) {
        showToast('Error loading patient', 'error');
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, [unwrappedParams, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!patient) return;
    const { name, value } = e.target;
    if (name === 'treatment_done' && value === 'ADD_NEW_TREATMENT_OPTION') {
        setIsAddingTreatment(true);
        return;
    }
    if (name === 'treatment_done') {
        const currentList = patient.treatment_done ? patient.treatment_done.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!currentList.includes(value)) {
            const newList = [...currentList, value];
            setPatient({ ...patient, treatment_done: newList.join(', ') });
        }
        return;
    }
    setPatient({ ...patient, [name]: value });
  };

  const removeTreatment = (tToRemove: string) => {
      if (!patient) return;
      const currentList = patient.treatment_done ? patient.treatment_done.split(',').map(s => s.trim()).filter(Boolean) : [];
      const newList = currentList.filter(t => t !== tToRemove);
      setPatient({ ...patient, treatment_done: newList.join(', ') });
  };

  const handleAddNewTreatment = async () => {
      if (!newTreatmentName.trim()) { setIsAddingTreatment(false); return; }
      try {
          const res = await fetch('/api/treatments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newTreatmentName })
          });
          if (res.ok) {
              const newT = await res.json();
              setTreatments(prev => [...prev, newT].sort((a,b) => a.name.localeCompare(b.name)));
              if (patient) {
                  const currentList = patient.treatment_done ? patient.treatment_done.split(',').map(s => s.trim()).filter(Boolean) : [];
                  setPatient({ ...patient, treatment_done: [...currentList, newT.name].join(', ') });
              }
              showToast('Treatment added', 'success');
          }
      } catch (e) { showToast('Error', 'error'); } finally { setIsAddingTreatment(false); setNewTreatmentName(''); }
  };

  const handleAddPayment = () => {
      if (!newPayment.amount || isNaN(Number(newPayment.amount))) {
          showToast('Invalid amount', 'error');
          return;
      }
      const p: PaymentRecord = { id: Math.random().toString(36).substr(2, 9), amount: Number(newPayment.amount), date: newPayment.date, purpose: newPayment.purpose || 'Visit', mode: newPayment.mode };
      const newList = [...paymentList, p];
      setPaymentList(newList);
      const newTotal = newList.reduce((sum, x) => sum + Number(x.amount), 0);
      if (patient) setPatient({ ...patient, amount: newTotal, payments: JSON.stringify(newList) });
      setNewPayment({ amount: '', purpose: '', mode: 'Cash', date: new Date().toISOString().split('T')[0] });
      setShowPaymentForm(false);
  };

  const removePayment = (id: string) => {
      if (!confirm('Delete record?')) return;
      const newList = paymentList.filter(p => p.id !== id);
      setPaymentList(newList);
      const newTotal = newList.reduce((sum, x) => sum + Number(x.amount), 0);
      if (patient) setPatient({ ...patient, amount: newTotal, payments: JSON.stringify(newList) });
  };

  const handleToothChange = (value: string) => {
    if (!patient) return;
    setPatient({ ...patient, tooth_number: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          const newX: XRay = { id: Math.random().toString(36).substr(2, 9), image: reader.result as string, description: '', date: new Date().toISOString().split('T')[0] };
          const newList = [...xrayList, newX];
          setXrayList(newList);
          if (patient) setPatient({ ...patient, xrays: JSON.stringify(newList) });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const updateXray = (index: number, field: keyof XRay, value: string) => {
      const newList = [...xrayList];
      newList[index] = { ...newList[index], [field]: value };
      setXrayList(newList);
      if (patient) setPatient({ ...patient, xrays: JSON.stringify(newList) });
  };

  const removeXray = (index: number) => {
      if (!confirm('Delete X-Ray?')) return;
      const newList = xrayList.filter((_, i) => i !== index);
      setXrayList(newList);
      if (patient) setPatient({ ...patient, xrays: JSON.stringify(newList) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !unwrappedParams) return;
    setSaving(true);

    const submissionData = {
      ...patient,
      phone_number: patient.phone_number ? (patient.phone_number.startsWith('+91') ? patient.phone_number : `+91${patient.phone_number.replace(/\D/g, '')}`) : ''
    };

    try {
      const res = await fetch(`/api/patients/${unwrappedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      if (res.ok) {
        showToast('Saved', 'success');
        setPatient(submissionData);
        setInitialPatient(JSON.parse(JSON.stringify(submissionData)));
        setIsEditing(false);
      } else { showToast('Error', 'error'); }
    } catch (err) { showToast('Error', 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
      if (!confirm('Delete patient?')) return;
      if (!unwrappedParams) return;
      try {
          const res = await fetch(`/api/patients/${unwrappedParams.id}`, { method: 'DELETE' });
          if (res.ok) { showToast('Deleted', 'success'); router.push('/'); }
      } catch (error) { console.error(error); }
  };

  const handleBack = () => {
      if (isEditing && isDirty) {
          if (!confirm('You have unsaved changes. Are you sure you want to leave?')) return;
      }
      router.push('/');
  };

  // --- Zoom & Pan Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (zoom > 1) {
          setPanning(true);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (panning) {
          setPos({
              x: pos.x + e.movementX,
              y: pos.y + e.movementY
          });
      }
  };

  const handleMouseUp = () => setPanning(false);

  const handleZoom = (delta: number) => {
      setZoom(prev => Math.max(1, Math.min(prev + delta, 5)));
      if (zoom + delta <= 1) setPos({ x: 0, y: 0 }); // Reset pos if zoomed out to normal
  };

  if (loading || !patient) return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-900 dark:text-gray-100 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8"><Skeleton className="h-10 w-48" /><Skeleton className="h-6 w-32" /></div>
          <div className="bg-white dark:bg-gray-900 shadow rounded overflow-hidden border border-gray-100 dark:border-gray-800">
             <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 border-b dark:border-gray-700"><div className="flex justify-between items-center"><div><Skeleton className="h-6 w-40 mb-2" /><Skeleton className="h-4 w-24" /></div><Skeleton className="h-8 w-32" /></div></div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1, 2, 3, 4, 5, 6].map(i => (<div key={i} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>))}<div className="col-span-full"><Skeleton className="h-32 w-full" /></div></div>
          </div>
        </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar activePage="Patient Details" />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Patient Details</h1>
            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-900 p-1 rounded border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden text-gray-900 dark:text-gray-100">
                {!isEditing ? (
                    <>
                        <button onClick={() => setIsEditing(true)} className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2 text-xs sm:text-sm font-semibold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Edit
                        </button>
                        <button onClick={handleDelete} className="px-3 sm:px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition flex items-center gap-2 text-xs sm:text-sm font-medium border border-transparent hover:border-red-100 dark:hover:border-red-900/30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Delete
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={handleSave} disabled={saving} className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-sm">
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => { if (isDirty && !confirm('Discard changes?')) return; setIsEditing(false); setPatient(JSON.parse(JSON.stringify(initialPatient))); setXrayList(initialPatient?.xrays ? JSON.parse(initialPatient.xrays) : []); }} className="px-3 sm:px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition text-xs sm:text-sm font-medium">
                            Cancel
                        </button>
                    </>
                )}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block"></div>
                <button onClick={handleBack} className="px-3 sm:px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition text-xs sm:text-sm font-medium flex items-center gap-1">← Back</button>
            </div>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 shadow rounded overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="bg-blue-600 px-8 py-6 border-b border-blue-700">
                <div className="flex justify-between items-center text-white">
                    <div className="flex-1 mr-4">
                        {isEditing ? (
                            <input name="name" value={patient.name} onChange={handleChange} className="bg-blue-700 text-white border-none rounded px-3 py-1 text-2xl font-bold w-full focus:ring-2 focus:ring-white outline-none capitalize shadow-inner" placeholder="Name" />
                        ) : (
                            <h2 className="text-2xl font-bold capitalize tracking-tight">{patient.name}</h2>
                        )}
                        <p className="text-blue-100/80 text-sm font-medium mt-1">ID: {patient.patient_id}</p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                         <span className="block text-[10px] uppercase tracking-widest text-blue-200 mb-1 font-bold">Last Visit</span>
                         {isEditing ? (
                             <input name="date" type="date" value={patient.date || ''} onChange={handleChange} className="bg-blue-700 text-white border-none rounded p-2 text-sm focus:ring-2 focus:ring-white outline-none" />
                         ) : (
                             <span className="text-xl font-bold">{new Date(patient.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                         )}
                    </div>
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="col-span-full md:col-span-1 space-y-5">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold border-b dark:border-gray-800 pb-2">Personal Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                            {isEditing ? (
                                <div className="flex">
                                    <div className="flex items-center gap-1.5 px-3 border border-r-0 border-gray-300 dark:border-gray-700 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors">
                                        <span>🇮🇳</span>
                                        <span>+91</span>
                                    </div>
                                    <input 
                                        name="phone_number" 
                                        value={patient.phone_number?.replace('+91', '') || ''} 
                                        onChange={handleChange} 
                                        className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-r-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 transition" 
                                        type="tel"
                                    />
                                </div>
                            ) : (
                                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100">{patient.phone_number || 'N/A'}</div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Age</label>
                                {isEditing ? <input name="age" type="number" value={patient.age} onChange={handleChange} className="w-full p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 h-[38px]" /> : <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100 h-[38px] flex items-center font-medium">{patient.age || '0'} Years</div>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Gender</label>
                                {isEditing ? <select name="gender" value={patient.gender} onChange={handleChange} className="w-full p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white h-[38px]"><option>Male</option><option>Female</option><option>Other</option></select> : <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100 h-[38px] flex items-center font-medium">{patient.gender}</div>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                            {isEditing ? <select name="patient_type" value={patient.patient_type} onChange={handleChange} className="w-full p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white h-[38px]"><option>New</option><option>Returning</option></select> : <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100 h-[38px] flex items-center">{patient.patient_type || 'N/A'}</div>}
                        </div>
                    </div>
                </div>

                <div className="col-span-full md:col-span-1 space-y-5">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold border-b dark:border-gray-800 pb-2">Treatment</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Procedures Done</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {patient.treatment_done?.split(',').map(s => s.trim()).filter(Boolean).map((t, idx) => (
                                    <span key={idx} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-1 rounded border border-blue-100 dark:border-blue-900/50 uppercase tracking-tighter capitalize">
                                        {t}
                                        {isEditing && <button type="button" onClick={() => removeTreatment(t)} className="ml-1.5 text-blue-400 hover:text-blue-900 dark:hover:text-blue-200">×</button>}
                                    </span>
                                ))}
                            </div>
                            {isEditing && (
                                isAddingTreatment ? (
                                    <div className="flex gap-2">
                                        <input autoFocus value={newTreatmentName} onChange={(e) => setNewTreatmentName(e.target.value)} placeholder="New..." className="flex-1 p-2 border dark:border-gray-700 rounded outline-none text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewTreatment())} />
                                        <button type="button" onClick={handleAddNewTreatment} className="bg-blue-600 text-white px-3 rounded text-xs font-bold uppercase">Add</button>
                                    </div>
                                ) : (
                                    <select value="" onChange={handleChange} name="treatment_done" className="w-full p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow-sm">
                                        <option value="" disabled>+ Add Procedure</option>
                                        {treatments.filter(t => !patient.treatment_done?.includes(t.name)).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                        <option value="ADD_NEW_TREATMENT_OPTION" className="font-bold text-blue-600">Create New...</option>
                                    </select>
                                )
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Doctor</label>
                            {isEditing ? <select name="doctor" value={patient.doctor || ''} onChange={handleChange} className="w-full p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 h-[38px]"><option value="">Select Doctor</option>{doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select> : <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100 font-semibold h-[38px] flex items-center capitalize">{patient.doctor || 'N/A'}</div>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Share</label>
                            {isEditing ? <input name="share" value={patient.share || ''} onChange={handleChange} className="w-full p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 h-[38px]" /> : <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100 h-[38px] flex items-center">{patient.share || 'N/A'}</div>}
                        </div>
                    </div>
                </div>

                <div className="col-span-full md:col-span-1 space-y-5 border-l md:pl-8 border-gray-100 dark:border-gray-800 font-sans">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold border-b dark:border-gray-800 pb-2">Financials</h3>
                    <div className="bg-green-50 dark:bg-green-900/10 rounded p-6 border border-green-100 dark:border-green-900/30 shadow-inner">
                        <label className="block text-[10px] font-bold text-green-600 dark:text-green-500 uppercase mb-1 tracking-widest text-center font-sans">Total Collection</label>
                        <div className="text-4xl font-black text-green-700 dark:text-green-400 tracking-tighter text-center">₹{patient.amount.toLocaleString()}</div>
                        <div className="mt-4 overflow-hidden rounded border border-green-200 dark:border-green-900/50">
                            <table className="min-w-full text-[10px] bg-white/50 dark:bg-gray-900/50">
                                <thead className="bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 uppercase tracking-widest font-bold font-sans"><tr><th className="px-3 py-1.5 text-left">Date</th><th className="px-3 py-1.5 text-right font-sans">Amt</th></tr></thead>
                                <tbody className="divide-y divide-green-100 dark:divide-green-900/30">
                                    {paymentList.slice(-3).map(p => <tr key={p.id}><td className="px-3 py-1.5 text-green-700 dark:text-green-400">{p.date}</td><td className="px-3 py-1.5 text-right font-bold text-green-800 dark:text-green-300 font-sans">₹{p.amount}</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* X-Ray Records */}
                <div className="col-span-full space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold">X-Ray Records</h3>
                        {isEditing && (
                            <label className="cursor-pointer text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-widest hover:underline uppercase">
                                + Add X-Ray
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        )}
                    </div>
                    {xrayList.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {xrayList.map((x, idx) => (
                                <div key={x.id} className="group relative border dark:border-gray-800 rounded overflow-hidden bg-gray-50 dark:bg-gray-800/50 flex flex-col">
                                    <div className="h-32 bg-gray-900 relative cursor-zoom-in" onClick={() => { setSelectedXray(x); setZoom(1); setPos({x:0, y:0}); }}>
                                        <img src={x.image} alt="X-Ray" className="w-full h-full object-contain" />
                                        {isEditing && (
                                            <button type="button" onClick={(e) => { e.stopPropagation(); removeXray(idx); }} className="absolute top-1 right-1 bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-700">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <div className="p-2 space-y-1 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
                                            <input type="date" value={x.date} onChange={(e) => updateXray(idx, 'date', e.target.value)} className="w-full text-[10px] p-1 border dark:border-gray-700 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-800" />
                                            <input type="text" placeholder="Note..." value={x.description} onChange={(e) => updateXray(idx, 'description', e.target.value)} className="w-full text-[10px] p-1 border dark:border-gray-700 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-800" />
                                        </div>
                                    ) : (
                                        <div className="p-2 text-[10px] text-gray-500 dark:text-gray-400 flex flex-col truncate">
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{x.date}</span>
                                            <span className="truncate">{x.description || 'No description.'}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/30 rounded border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 text-xs italic">No X-ray images attached.</div>
                    )}
                </div>

                {/* Payment History */}
                <div className="col-span-full space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800 font-sans">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold">Payment History</h3>
                        {isEditing && !showPaymentForm && (
                            <button type="button" onClick={() => setShowPaymentForm(true)} className="text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:underline tracking-widest uppercase font-sans">+ New Payment</button>
                        )}
                    </div>
                    {isEditing && showPaymentForm && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded border border-blue-100 dark:border-blue-900/30 flex flex-wrap gap-3 items-end animate-in fade-in shadow-inner text-gray-900 dark:text-gray-100">
                            <div className="flex-1 min-w-[120px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 font-sans">Date</label><input type="date" value={newPayment.date} onChange={(e) => setNewPayment({...newPayment, date: e.target.value})} className="w-full p-2 border dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 outline-none" /></div>
                            <div className="flex-[2] min-w-[150px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 font-sans">Purpose</label><input type="text" placeholder="Purpose" value={newPayment.purpose} onChange={(e) => setNewPayment({...newPayment, purpose: e.target.value})} className="w-full p-2 border dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 outline-none" /></div>
                            <div className="flex-1 min-w-[100px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 font-sans">Mode</label><select value={newPayment.mode} onChange={(e) => setNewPayment({...newPayment, mode: e.target.value})} className="w-full p-2 border dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 outline-none"><option>Cash</option><option>Card</option><option>UPI</option></select></div>
                            <div className="flex-1 min-w-[100px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 font-sans">Amt (₹)</label><input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} className="w-full p-2 border dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 outline-none" /></div>
                            <div className="flex gap-2"><button type="button" onClick={handleAddPayment} className="bg-blue-600 text-white px-4 py-2 rounded text-[10px] font-bold shadow-sm uppercase h-9 hover:bg-blue-700 transition">Save</button><button type="button" onClick={() => setShowPaymentForm(false)} className="bg-white dark:bg-gray-800 text-gray-500 border dark:border-gray-700 px-3 py-2 rounded text-[10px] font-bold uppercase h-9">✕</button></div>
                        </div>
                    )}
                    <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded shadow-sm">
                        <table className="min-w-full bg-white dark:bg-gray-900 text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[9px] font-bold"><tr><th className="px-6 py-3 text-left font-sans">Date</th><th className="px-6 py-3 text-left font-sans">Description</th><th className="px-6 py-3 text-left font-sans">Mode</th><th className="px-6 py-3 text-right font-sans">Amount</th>{isEditing && <th className="px-6 py-3 text-center w-10"></th>}</tr></thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                                {paymentList.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic font-medium font-sans">No payment records found.</td></tr>}
                                {paymentList.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                        <td className="px-6 py-3 font-medium font-sans">{p.date}</td><td className="px-6 py-3 capitalize font-sans">{p.purpose}</td><td className="px-6 py-3 font-sans"><span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px]">{p.mode}</span></td><td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white font-mono font-sans">₹{p.amount.toLocaleString()}</td>
                                        {isEditing && <td className="px-6 py-3 text-center font-sans"><button type="button" onClick={() => removePayment(p.id)} className="text-red-300 hover:text-red-600 transition text-lg leading-none font-sans">×</button></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Notes */}
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100 dark:border-gray-800 font-sans">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest font-sans">Medicines</label>
                        {isEditing ? <textarea name="medicine_prescribed" value={patient.medicine_prescribed || ''} onChange={handleChange} className="w-full p-4 border dark:border-gray-700 rounded h-32 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 transition text-sm" /> : <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100 text-sm min-h-[8rem] whitespace-pre-wrap italic text-gray-600 dark:text-gray-400 shadow-inner font-sans">{patient.medicine_prescribed || 'None.'}</div>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest font-sans">Notes</label>
                        {isEditing ? <textarea name="notes" value={patient.notes || ''} onChange={handleChange} className="w-full p-4 border dark:border-gray-700 rounded h-32 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 transition text-sm" /> : <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-900 dark:text-gray-100 text-sm min-h-[8rem] whitespace-pre-wrap italic text-gray-600 dark:text-gray-400 shadow-inner font-sans">{patient.notes || 'None.'}</div>}
                    </div>
                </div>

                <div className="col-span-full mt-6 pt-8 border-t border-gray-100 dark:border-gray-800 font-sans">
                    <div className="text-center mb-6"><label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] font-sans">Dental Odontogram</label></div>
                    <div className={!isEditing ? "pointer-events-none opacity-90" : ""}><div className="overflow-x-auto pb-4"><ToothSelector value={patient.tooth_number || ''} onChange={handleToothChange} /></div></div>
                    {!isEditing && patient.tooth_number && <div className="text-center text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-2 uppercase tracking-widest font-mono font-sans">Selected: {patient.tooth_number}</div>}
                </div>
            </div>
        </form>
      </div>

      {/* X-Ray Lightbox Modal with Zoom/Pan */}
      {selectedXray && (
          <div 
            className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in overflow-hidden" 
            onClick={() => setSelectedXray(null)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
              {/* Close button */}
              <button className="absolute top-6 right-6 text-white/50 hover:text-white transition z-[110]" title="Close">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>

              {/* Zoom Controls */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 z-[110]" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleZoom(-0.5)} className="text-white hover:text-blue-400 font-bold p-2 text-xl" title="Zoom Out">−</button>
                  <span className="text-white text-xs font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => handleZoom(0.5)} className="text-white hover:text-blue-400 font-bold p-2 text-xl" title="Zoom In">+</button>
                  <div className="w-px h-4 bg-white/20 mx-2"></div>
                  <button onClick={() => { setZoom(1); setPos({x:0,y:0}); }} className="text-white text-[10px] font-bold tracking-widest hover:text-blue-400 uppercase">Reset</button>
              </div>

              {/* Draggable Image */}
              <div 
                className={`max-w-full max-h-full transition-transform duration-200 ease-out select-none ${zoom > 1 ? 'cursor-move' : 'cursor-zoom-in'}`}
                style={{ 
                    transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
                }}
                onClick={e => { e.stopPropagation(); if (zoom === 1) handleZoom(1); }}
                onMouseDown={handleMouseDown}
              >
                  <img 
                    ref={imgRef}
                    src={selectedXray.image} 
                    alt="X-Ray" 
                    className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl pointer-events-none"
                    draggable="false"
                  />
              </div>

              {/* Info Overlay */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 pointer-events-none">
                  <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 text-white text-center">
                      <p className="text-sm font-bold tracking-tight">{selectedXray.date}</p>
                      {selectedXray.description && <p className="text-[10px] opacity-60 uppercase tracking-widest mt-0.5">{selectedXray.description}</p>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
