'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/types';
import ToothSelector from '@/components/ToothSelector';
import { useToast } from '@/components/ToastProvider';

import Skeleton from '@/components/Skeleton';

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

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lists
  const [xrayList, setXrayList] = useState<XRay[]>([]);
  const [paymentList, setPaymentList] = useState<PaymentRecord[]>([]);

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
      amount: '',
      purpose: '',
      mode: 'Cash',
      date: new Date().toISOString().split('T')[0]
  });
  
  // Data Lists
  const [treatments, setTreatments] = useState<{id: number, name: string}[]>([]);
  const [doctors, setDoctors] = useState<{id: number, name: string}[]>([]);
  
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);
  const [newTreatmentName, setNewTreatmentName] = useState('');

  useEffect(() => {
    params.then(setUnwrappedParams);
  }, [params]);

  // Load Metadata
  useEffect(() => {
      fetch('/api/treatments').then(res => res.json()).then(data => Array.isArray(data) && setTreatments(data));
      fetch('/api/doctors').then(res => res.json()).then(data => Array.isArray(data) && setDoctors(data));
  }, []);

  useEffect(() => {
    if (!unwrappedParams) return;
    
    async function fetchPatient() {
// ... (rest of fetchPatient remains same)
      try {
        const res = await fetch(`/api/patients/${unwrappedParams!.id}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        // --- Migration Logic ---
        let currentPayments: PaymentRecord[] = [];
        if (data.payments) {
            try {
                currentPayments = JSON.parse(data.payments);
            } catch (e) { console.error("Error parsing payments", e); }
        } else if (data.amount > 0) {
            // Migrating legacy single payment to list
            currentPayments = [{
                id: 'legacy-1',
                date: data.date || new Date().toISOString().split('T')[0],
                amount: Number(data.amount),
                purpose: data.paid_for || 'Initial Payment',
                mode: data.mode_of_payment || 'Cash'
            }];
        }
        setPaymentList(currentPayments);
        // Sync total just in case
        const total = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        data.amount = total;

        setPatient(data);
        
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
                } else {
                    setXrayList([]);
                }
            } catch (e) {
                setXrayList([]);
            }
        }
      } catch (err) {
        console.error(err);
        showToast('Error loading patient data', 'error');
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
    
    // Special handling for Treatment Dropdown (Adding items to list)
    if (name === 'treatment_done') {
        if (value === 'ADD_NEW_TREATMENT_OPTION') {
            setIsAddingTreatment(true);
            return;
        }
        // Multi-select logic: Add if not already present
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
      if (!newTreatmentName.trim()) {
          setIsAddingTreatment(false);
          return;
      }

      try {
          const res = await fetch('/api/treatments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newTreatmentName })
          });
          
          if (res.ok) {
              const newT = await res.json();
              setTreatments(prev => [...prev, newT].sort((a,b) => a.name.localeCompare(b.name)));
              // Add to patient list immediately
              if (patient) {
                  const currentList = patient.treatment_done ? patient.treatment_done.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const newList = [...currentList, newT.name];
                  setPatient({ ...patient, treatment_done: newList.join(', ') });
              }
              showToast('New treatment added', 'success');
          }
      } catch (e) {
          showToast('Failed to add treatment', 'error');
      } finally {
          setIsAddingTreatment(false);
          setNewTreatmentName('');
      }
  };

  // --- Payment Logic ---
  const handleAddPayment = () => {
      if (!newPayment.amount || isNaN(Number(newPayment.amount))) {
          showToast('Please enter a valid amount', 'error');
          return;
      }

      const payment: PaymentRecord = {
          id: Math.random().toString(36).substr(2, 9),
          amount: Number(newPayment.amount),
          date: newPayment.date,
          purpose: newPayment.purpose || 'Visit',
          mode: newPayment.mode
      };

      const newList = [...paymentList, payment];
      setPaymentList(newList);
      
      // Update Total
      const newTotal = newList.reduce((sum, p) => sum + Number(p.amount), 0);
      if (patient) {
          setPatient({ 
              ...patient, 
              amount: newTotal,
              payments: JSON.stringify(newList)
          });
      }

      setNewPayment({
          amount: '',
          purpose: '',
          mode: 'Cash',
          date: new Date().toISOString().split('T')[0]
      });
  };

  const removePayment = (id: string) => {
      if (!confirm('Delete this payment record?')) return;
      const newList = paymentList.filter(p => p.id !== id);
      setPaymentList(newList);
      const newTotal = newList.reduce((sum, p) => sum + Number(p.amount), 0);
      if (patient) {
          setPatient({ 
              ...patient, 
              amount: newTotal,
              payments: JSON.stringify(newList)
          });
      }
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
          const base64String = reader.result as string;
          const newXray: XRay = {
              id: Math.random().toString(36).substr(2, 9),
              image: base64String,
              description: '',
              date: new Date().toISOString().split('T')[0]
          };
          
          const newList = [...xrayList, newXray];
          setXrayList(newList);
          if (patient) {
              setPatient({ ...patient, xrays: JSON.stringify(newList) });
          }
      };
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = '';
  };

  const updateXray = (index: number, field: keyof XRay, value: string) => {
      const newList = [...xrayList];
      newList[index] = { ...newList[index], [field]: value };
      setXrayList(newList);
      if (patient) {
          setPatient({ ...patient, xrays: JSON.stringify(newList) });
      }
  };

  const removeXray = (index: number) => {
      if (!confirm('Are you sure you want to delete this X-Ray?')) return;
      const newList = xrayList.filter((_, i) => i !== index);
      setXrayList(newList);
      if (patient) {
          setPatient({ ...patient, xrays: JSON.stringify(newList) });
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !unwrappedParams) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/patients/${unwrappedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });

      if (res.ok) {
        showToast('Patient updated successfully!', 'success');
        router.push('/');
      } else {
        showToast('Failed to update patient', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
      if (!confirm('Are you sure you want to permanently delete this patient record? This cannot be undone.')) return;
      if (!unwrappedParams) return;

      try {
          const res = await fetch(`/api/patients/${unwrappedParams.id}`, {
              method: 'DELETE'
          });
          
          if (res.ok) {
              showToast('Patient deleted', 'success');
              router.push('/');
          } else {
              showToast('Failed to delete patient', 'error');
          }
      } catch (error) {
          console.error(error);
          showToast('Error deleting patient', 'error');
      }
  };

  if (loading || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
          
          <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">
             <div className="bg-gray-100 px-6 py-4 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-6 w-40 mb-2" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-32" />
                </div>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Simulate form fields */}
                 {[1, 2, 3, 4, 5, 6].map(i => (
                     <div key={i} className="space-y-2">
                         <Skeleton className="h-4 w-24" />
                         <Skeleton className="h-10 w-full" />
                     </div>
                 ))}
                 <div className="col-span-full">
                    <Skeleton className="h-32 w-full" />
                 </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Patient Details</h1>
            <div className="flex gap-4 items-center">
                <button 
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 bg-red-50 px-3 py-1 rounded border border-red-200 hover:bg-red-100 transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Delete Patient
                </button>
                <button 
                    onClick={() => router.push('/')}
                    className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
                >
                    ← Back to Dashboard
                </button>
            </div>
        </div>

        <form onSubmit={handleSave} className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">
            {/* Header Section */}
            <div className="bg-blue-600 px-6 py-4 border-b border-blue-700">
                <div className="flex justify-between items-center text-white">
                    <div>
                        <h2 className="text-xl font-semibold">{patient.name}</h2>
                        <p className="text-blue-100 text-sm">ID: {patient.patient_id}</p>
                    </div>
                    <div className="text-right">
                         <span className="block text-sm opacity-80">Last Visit</span>
                         <input 
                            name="date" 
                            type="date" 
                            value={patient.date || ''} 
                            onChange={handleChange}
                            className="bg-blue-700 text-white border-none rounded p-1 text-sm focus:ring-2 focus:ring-white outline-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Personal Info */}
                <div className="col-span-full md:col-span-1 space-y-4">
                    <h3 className="text-sm uppercase tracking-wide text-gray-500 font-bold border-b pb-2">Personal Info</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input name="name" value={patient.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input name="phone_number" value={patient.phone_number} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                            <input name="age" type="number" value={patient.age} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select name="gender" value={patient.gender} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition bg-white text-gray-900">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Type</label>
                        <select name="patient_type" value={patient.patient_type} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition bg-white text-gray-900">
                            <option>New</option>
                            <option>Returning</option>
                        </select>
                    </div>
                </div>

                {/* Treatment Details */}
                <div className="col-span-full md:col-span-1 space-y-4">
                    <h3 className="text-sm uppercase tracking-wide text-gray-500 font-bold border-b pb-2">Treatment Info</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Done</label>
                        
                        {/* Selected Tags */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {patient.treatment_done?.split(',').map(s => s.trim()).filter(Boolean).map((t, idx) => (
                                <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    {t}
                                    <button 
                                        type="button" 
                                        onClick={() => removeTreatment(t)}
                                        className="hover:text-blue-900 font-bold focus:outline-none"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>

                        {isAddingTreatment ? (
                            <div className="flex gap-2">
                                <input 
                                    autoFocus
                                    value={newTreatmentName}
                                    onChange={(e) => setNewTreatmentName(e.target.value)}
                                    placeholder="Enter new treatment..."
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddNewTreatment();
                                        }
                                    }}
                                />
                                <button type="button" onClick={handleAddNewTreatment} className="bg-blue-600 text-white px-3 rounded text-sm">Save</button>
                                <button type="button" onClick={() => setIsAddingTreatment(false)} className="text-gray-500 hover:text-gray-700 px-1">✕</button>
                            </div>
                        ) : (
                            <select 
                                name="treatment_done" 
                                value=""
                                onChange={handleChange} 
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 bg-white"
                            >
                                <option value="" disabled>+ Add Treatment</option>
                                {treatments.filter(t => !patient.treatment_done?.includes(t.name)).map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                                <option disabled>──────────</option>
                                <option value="ADD_NEW_TREATMENT_OPTION" className="font-semibold text-blue-600">+ Create New Treatment...</option>
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                        <select 
                            name="doctor" 
                            value={patient.doctor || ''} 
                            onChange={handleChange} 
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 bg-white"
                        >
                            <option value="">Select Doctor</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Share</label>
                        <input name="share" value={patient.share || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900" />
                    </div>
                </div>

                {/* Billing History Section */}
                <div className="col-span-full space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm uppercase tracking-wide text-gray-500 font-bold">Billing & Payments</h3>
                        <div className="text-lg font-bold text-green-700">
                            Total Paid: ₹{patient.amount}
                        </div>
                    </div>

                    {/* Payment List Table */}
                    <div className="overflow-hidden border rounded-lg">
                        <table className="min-w-full bg-white text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-4 py-2 text-left">Date</th>
                                    <th className="px-4 py-2 text-left">Purpose</th>
                                    <th className="px-4 py-2 text-left">Mode</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                    <th className="px-4 py-2 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paymentList.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">No payments recorded yet.</td>
                                    </tr>
                                )}
                                {paymentList.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-2 text-gray-800">{p.date}</td>
                                        <td className="px-4 py-2 text-gray-600">{p.purpose}</td>
                                        <td className="px-4 py-2 text-gray-600">{p.mode}</td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-900">₹{p.amount}</td>
                                        <td className="px-4 py-2 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => removePayment(p.id)}
                                                className="text-red-400 hover:text-red-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Payment Form */}
                    {showPaymentForm ? (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-2 items-end animate-in fade-in slide-in-from-top-2">
                            <div className="flex-1 min-w-[120px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                <input 
                                    type="date" 
                                    value={newPayment.date}
                                    onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                                    className="w-full p-2 border rounded text-sm outline-none text-gray-900"
                                />
                            </div>
                            <div className="flex-[2] min-w-[150px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Purpose</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Root Canal - 1st Sitting"
                                    value={newPayment.purpose}
                                    onChange={(e) => setNewPayment({...newPayment, purpose: e.target.value})}
                                    className="w-full p-2 border rounded text-sm outline-none text-gray-900"
                                />
                            </div>
                            <div className="flex-1 min-w-[100px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Mode</label>
                                <select 
                                    value={newPayment.mode}
                                    onChange={(e) => setNewPayment({...newPayment, mode: e.target.value})}
                                    className="w-full p-2 border rounded text-sm outline-none bg-white text-gray-900"
                                >
                                    <option>Cash</option>
                                    <option>Card</option>
                                    <option>UPI</option>
                                    <option>Insurance</option>
                                </select>
                            </div>
                            <div className="flex-1 min-w-[100px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
                                <input 
                                    type="number" 
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                    className="w-full p-2 border rounded text-sm outline-none text-gray-900"
                                    placeholder="0"
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={handleAddPayment}
                                className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 text-sm font-medium h-10"
                            >
                                Save
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setShowPaymentForm(false)}
                                className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm font-medium h-10"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => setShowPaymentForm(true)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                            + Add New Payment
                        </button>
                    )}
                </div>

                {/* Large Text Areas */}
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Prescribed</label>
                        <textarea name="medicine_prescribed" value={patient.medicine_prescribed || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded h-32 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none text-gray-900" placeholder="List medicines..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea name="notes" value={patient.notes || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded h-32 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none text-gray-900" placeholder="Internal notes..." />
                    </div>
                </div>

                {/* X-Ray Upload Section */}
                <div className="col-span-full mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">X-Ray Images</h3>
                    <div className="flex flex-col gap-4">
                         <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition text-sm font-medium flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                Upload X-Ray
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                            <span className="text-xs text-gray-400">Supported: JPG, PNG (Max 5MB)</span>
                         </div>
                         
                         {/* Gallery Grid */}
                         {xrayList.length > 0 && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                                 {xrayList.map((xray, idx) => (
                                     <div key={xray.id} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                                         {/* Image */}
                                         <div className="h-48 bg-gray-900 relative">
                                            <img src={xray.image} alt="X-Ray" className="w-full h-full object-contain" />
                                            <button 
                                                type="button"
                                                onClick={() => removeXray(idx)}
                                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-700"
                                                title="Delete Image"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                         </div>
                                         
                                         {/* Metadata Inputs */}
                                         <div className="p-3 bg-gray-50 space-y-2 border-t border-gray-200">
                                             <input 
                                                type="date"
                                                value={xray.date}
                                                onChange={(e) => updateXray(idx, 'date', e.target.value)}
                                                className="w-full text-xs p-1.5 border rounded text-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                             />
                                             <input 
                                                type="text"
                                                placeholder="Add description..."
                                                value={xray.description}
                                                onChange={(e) => updateXray(idx, 'description', e.target.value)}
                                                className="w-full text-xs p-1.5 border rounded text-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                             />
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                </div>

                {/* Tooth Chart Section - Full Width at Bottom */}
                <div className="col-span-full mt-6 pt-6 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-4 text-center">Dental Chart (Select Teeth)</label>
                    <div className="overflow-x-auto pb-4">
                        <ToothSelector 
                            value={patient.tooth_number || ''} 
                            onChange={handleToothChange}
                        />
                    </div>
                </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                 <button 
                    type="button" 
                    onClick={() => router.push('/')}
                    className="px-6 py-2 border border-gray-300 rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition font-medium"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={saving} 
                    className="px-6 py-2 bg-blue-600 text-white rounded shadow-md hover:bg-blue-700 transition font-medium disabled:opacity-70 flex items-center gap-2"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
