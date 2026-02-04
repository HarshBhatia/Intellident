'use client';

import { Patient } from '@/types';
import { useRouter } from 'next/navigation';

interface PatientTableProps {
  patients: Patient[];
}

export default function PatientTable({ patients }: PatientTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white text-sm text-left text-gray-600">
          <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b">Action</th>
              <th className="px-6 py-3 border-b">Name</th>
              <th className="px-6 py-3 border-b">Phone</th>
              <th className="px-6 py-3 border-b">Gender</th>
              <th className="px-6 py-3 border-b">Date</th>
              <th className="px-6 py-3 border-b">Doctor</th>
              <th className="px-6 py-3 border-b">Treatment</th>
              <th className="px-6 py-3 border-b text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patients.map((patient) => (
              <tr 
                key={patient.id} 
                className="hover:bg-blue-50 transition duration-150 cursor-pointer group"
                onClick={() => router.push(`/patients/${patient.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium group-hover:underline">
                  View
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 capitalize">
                  {patient.name}
                  <span className="block text-xs text-gray-400 font-normal">{patient.patient_id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.phone_number || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-2 py-1 rounded-full text-xs ${patient.gender === 'Male' ? 'bg-blue-100 text-blue-700' : patient.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700'}`}>
                     {patient.gender}
                   </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.date}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{patient.doctor || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate capitalize">{patient.treatment_done || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                  ₹{patient.amount}
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    <p>No patients found yet.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}