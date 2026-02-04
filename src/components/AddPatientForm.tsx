'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Patient } from '@/types';
import { useToast } from '@/components/ToastProvider';

interface AddPatientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddPatientForm({ onSuccess, onCancel }: AddPatientFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({
    patient_id: `PID-${Math.floor(Math.random() * 10000)}`, 
    date: new Date().toISOString().split('T')[0],
    name: '',
    gender: 'Male',
    phone_number: '',
    // Default values for other fields
    age: 0,
    amount: 0,
    doctor: '',
    mode_of_payment: 'Cash',
    paid_for: '',
    medicine_prescribed: '',
    notes: '',
    patient_type: 'New',
    share: '',
    tooth_number: '',
    treatment_done: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submissionData = {
      ...formData,
      phone_number: formData.phone_number ? `+91${formData.phone_number.replace(/\D/g, '')}` : ''
    };

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Patient added successfully!', 'success');
        router.push(`/patients/${data.patient_id}`);
      } else {
        showToast('Failed to add patient', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 max-w-lg mx-auto transform transition-all">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">New Patient</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter basic details to create a record</p>
      </div>
      
      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Full Name</label>
          <input 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700"
            placeholder="e.g. John Doe"
            required 
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Phone Number</label>
          <div className="flex">
            <div className="flex items-center gap-1.5 px-3 border border-r-0 border-gray-300 dark:border-gray-700 rounded-l-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors">
              <span>🇮🇳</span>
              <span>+91</span>
            </div>
            <input 
              name="phone_number" 
              value={formData.phone_number} 
              onChange={handleChange} 
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700"
              placeholder="12345 67890"
              type="tel"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Age</label>
                <input 
                    name="age" 
                    type="number"
                    value={formData.age} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700"
                    placeholder="0"
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Gender</label>
                <div className="relative">
                    <select 
                        name="gender" 
                        value={formData.gender} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 appearance-none cursor-pointer h-[42px]"
                    >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {!showMore ? (
        <button 
          type="button" 
          onClick={() => setShowMore(true)}
          className="w-full py-2.5 mb-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add More Details
        </button>
      ) : (
        <div className="space-y-5 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
           <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Treatment Fees (₹)</label>
              <input 
                name="amount" 
                type="number"
                value={formData.amount} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 font-mono"
                placeholder="0"
              />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Doctor</label>
                <input 
                    name="doctor" 
                    value={formData.doctor} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700"
                    placeholder="Doctor Name"
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Notes</label>
                <textarea 
                    name="notes" 
                    value={formData.notes} 
                    onChange={(e: any) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 text-sm h-24 resize-none"
                    placeholder="Extra notes..."
                />
            </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-5 py-2.5 rounded-md text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-[0.98]"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading} 
          className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
          {loading ? 'Creating...' : 'Create Patient'}
        </button>
      </div>
    </form>
  );
}