'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { Analytics } from '@/lib/analytics';

interface AddPatientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const GENDERS = ['Male', 'Female', 'Other'] as const;
const PATIENT_TYPES = ['Regular', 'Insurance', 'Corporate', 'Staff / family'] as const;
const inputCls =
  'w-full px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-gray-300 dark:placeholder:text-gray-600';

export default function AddPatientForm({ onSuccess, onCancel }: AddPatientFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string>('Male');
  const [patientType, setPatientType] = useState('Regular');
  const [referral, setReferral] = useState('');
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const digits = phone.replace(/\D/g, '').slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name is required', 'error');
      nameRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone_number: digits ? `+91${digits}` : '',
          age: age === '' ? undefined : Number(age),
          gender,
          patient_type: patientType || undefined,
          referral_source: referral || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        Analytics.patientCreated();
        showToast('Patient added', 'success');
        onSuccess();
        router.push(`/patients/${data.patient_id}`);
      } else {
        showToast('Failed to add patient', 'error');
      }
    } catch {
      showToast('Error adding patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 sm:p-7 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 w-full max-w-md mx-auto">
      <div className="mb-5">
        <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">New Patient</h2>
        <p className="text-xs text-gray-400 mt-1">Name is enough to start. Add phone so you can call them later.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            ref={nameRef}
            name="name"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
            placeholder="Priya Sharma"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-800">
            <span className="px-3 flex items-center text-sm text-gray-400 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700 font-semibold whitespace-nowrap">🇮🇳 +91</span>
            <input
              name="phone_number"
              type="tel"
              inputMode="numeric"
              value={digits}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="flex-1 px-3 py-2.5 text-sm font-medium bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-300"
              placeholder="98765 43210"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Age</label>
            <input
              name="age"
              type="number"
              min={0}
              max={120}
              value={age}
              onChange={e => setAge(e.target.value)}
              className={inputCls}
              placeholder="—"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 h-[42px]">
              {GENDERS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 text-xs font-bold rounded-[10px] transition ${
                    gender === g
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Patient type</label>
          <select name="patient_type" value={patientType} onChange={e => setPatientType(e.target.value)} className={inputCls}>
            {PATIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {showMore ? (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">How did they hear about us?</label>
            <select name="referral_source" value={referral} onChange={e => setReferral(e.target.value)} className={inputCls}>
              <option value="">Skip for now</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Instagram / Social Media">Instagram / Social Media</option>
              <option value="Referred by friend or patient">Referred by friend or patient</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Other">Other</option>
            </select>
          </div>
        ) : (
          <button type="button" onClick={() => setShowMore(true)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            + Referral source (optional)
          </button>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          {loading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
          {loading ? 'Creating…' : 'Create patient'}
        </button>
      </div>
    </form>
  );
}