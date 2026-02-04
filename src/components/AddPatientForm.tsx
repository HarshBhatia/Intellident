'use client';

import { useState } from 'react';
import { Patient } from '@/types';
import { useToast } from '@/components/ToastProvider';

interface AddPatientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddPatientForm({ onSuccess, onCancel }: AddPatientFormProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
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

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Patient added successfully!', 'success');
        onSuccess();
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
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md text-gray-800 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-6 text-blue-600 text-center">Quick Add Patient</h2>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
          <input 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="e.g. John Doe"
            required 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Phone Number</label>
          <input 
            name="phone_number" 
            value={formData.phone_number} 
            onChange={handleChange} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="e.g. +1234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Gender</label>
          <select 
            name="gender" 
            value={formData.gender} 
            onChange={handleChange} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-6 py-2 border rounded text-gray-700 hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading} 
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Add Patient'}
        </button>
      </div>
    </form>
  );
}