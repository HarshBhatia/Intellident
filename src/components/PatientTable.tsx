'use client';

import { Patient } from '@/types';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

interface PatientTableProps {
  patients: Patient[];
}

type SortKey = 'name' | 'age' | 'amount' | 'date';
type SortDirection = 'asc' | 'desc';

export default function PatientTable({ patients }: PatientTableProps) {
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedPatients = useMemo(() => {
    const sorted = [...patients];
    sorted.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle numeric conversions
      if (sortConfig.key === 'amount' || sortConfig.key === 'age') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      
      // Handle string comparisons
      if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [patients, sortConfig]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const Header = ({ label, column }: { label: string; column?: SortKey }) => (
    <th 
      className={`px-6 py-3 border-b ${column ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
      onClick={() => column && handleSort(column)}
    >
      <div className="flex items-center">
        {label}
        {column && <SortIcon column={column} />}
      </div>
    </th>
  );

  return (
    <div className="overflow-hidden border border-gray-200 rounded shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white text-sm text-left text-gray-600">
          <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b">Action</th>
              <Header label="Name" column="name" />
              <Header label="Age" column="age" />
              <th className="px-6 py-3 border-b">Gender</th>
              <th className="px-6 py-3 border-b">Phone</th>
              <Header label="Date" column="date" />
              <th className="px-6 py-3 border-b">Doctor</th>
              <th 
                className="px-6 py-3 border-b text-right cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end">
                   Amount <SortIcon column="amount" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedPatients.map((patient) => (
              <tr 
                key={patient.id} 
                className="hover:bg-blue-50 transition duration-150 cursor-pointer group"
                onClick={() => router.push(`/patients/${patient.patient_id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium group-hover:underline">
                  View
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 capitalize">
                  {patient.name}
                  <span className="block text-xs text-gray-400 font-normal">{patient.patient_id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.age || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   {(() => {
                     const g = patient.gender?.toLowerCase();
                     const isMale = g === 'm' || g === 'male';
                     const isFemale = g === 'f' || g === 'female';
                     return (
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                         isMale ? 'bg-blue-100 text-blue-700' : 
                         isFemale ? 'bg-pink-100 text-pink-700' : 
                         'bg-gray-100 text-gray-600'
                       }`}>
                         {patient.gender || '-'}
                       </span>
                     );
                   })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.phone_number || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.date}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{patient.doctor || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 font-mono">
                  ₹{Math.round(Number(patient.amount)).toLocaleString()}
                </td>
              </tr>
            ))}
            {sortedPatients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    <p>No patients found.</p>
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