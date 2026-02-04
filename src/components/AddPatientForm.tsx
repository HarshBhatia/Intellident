'use client';

import { useState } from 'react';
import { Patient } from '@/types';

interface AddPatientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddPatientForm({ onSuccess, onCancel }: AddPatientFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({
    patient_id: `PID-${Math.floor(Math.random() * 10000)}`, // Auto-gen simple ID
    date: new Date().toISOString().split('T')[0],
    name: '',
    age: 0,
    amount: 0,
    doctor: '',
    gender: 'Male',
    mode_of_payment: 'Cash',
    paid_for: '',
    phone_number: '',
    medicine_prescribed: '',
    notes: '',
    patient_type: 'New',
    share: '',
    tooth_number: '',
    treatment_done: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
        onSuccess();
      } else {
        alert('Failed to add patient');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md text-gray-800">
      <h2 className="text-xl font-bold mb-4 text-blue-600">Add New Patient</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Row 1 */}
        <div>
          <label className="block text-sm font-medium mb-1">Patient ID</label>
          <input name="patient_id" value={formData.patient_id} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Age</label>
          <input name="age" type="number" value={formData.age} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>

        {/* Row 2 */}
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>

        {/* Row 3 */}
        <div>
          <label className="block text-sm font-medium mb-1">Doctor</label>
          <input name="doctor" value={formData.doctor} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Treatment Done</label>
          <input name="treatment_done" value={formData.treatment_done} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tooth Number</label>
          <input name="tooth_number" value={formData.tooth_number} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>

        {/* Row 4 */}
        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input name="amount" type="number" value={formData.amount} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Paid For</label>
          <input name="paid_for" value={formData.paid_for} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mode of Payment</label>
          <select name="mode_of_payment" value={formData.mode_of_payment} onChange={handleChange} className="w-full p-2 border rounded">
            <option>Cash</option>
            <option>Card</option>
            <option>UPI</option>
            <option>Insurance</option>
          </select>
        </div>

        {/* Row 5 */}
        <div>
          <label className="block text-sm font-medium mb-1">Patient Type</label>
          <select name="patient_type" value={formData.patient_type} onChange={handleChange} className="w-full p-2 border rounded">
            <option>New</option>
            <option>Returning</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Share</label>
          <input name="share" value={formData.share} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g. 50%" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Medicine Prescribed</label>
        <textarea name="medicine_prescribed" value={formData.medicine_prescribed} onChange={handleChange} className="w-full p-2 border rounded h-20" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-2 border rounded h-20" />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {loading ? 'Saving...' : 'Save Patient'}
        </button>
      </div>
    </form>
  );
}
