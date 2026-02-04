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
      className={`px-6 py-3 border-b dark:border-gray-800 ${column ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none' : ''}`}
      onClick={() => column && handleSort(column)}
    >
      <div className="flex items-center">
        {label}
        {column && <SortIcon column={column} />}
      </div>
    </th>
  );

  return (
    <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-900 text-sm text-left text-gray-600 dark:text-gray-400 transition-colors">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b dark:border-gray-800">Action</th>
              <Header label="Name" column="name" />
              <Header label="Age" column="age" />
              <th className="px-6 py-3 border-b dark:border-gray-800">Gender</th>
              <th className="px-6 py-3 border-b dark:border-gray-800">Phone</th>
              <Header label="Date" column="date" />
              <th className="px-6 py-3 border-b dark:border-gray-800">Doctor</th>
              <th 
                className="px-6 py-3 border-b dark:border-gray-800 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end">
                   Amount <SortIcon column="amount" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sortedPatients.map((patient) => (
              <tr 
                key={patient.id} 
                className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition duration-150 cursor-pointer group"
                onClick={() => router.push(`/patients/${patient.patient_id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                  View
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {patient.name}
                  <span className="block text-xs text-gray-400 dark:text-gray-500 font-normal">{patient.patient_id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.age || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   {(() => {
                     const g = patient.gender?.toLowerCase();
                     const isMale = g === 'm' || g === 'male';
                     const isFemale = g === 'f' || g === 'female';
                     return (
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                         isMale ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 
                         isFemale ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300' : 
                         'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                       }`}>
                         {patient.gender || '-'}
                       </span>
                     );
                   })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.phone_number || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{patient.date}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{patient.doctor || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 dark:text-gray-100 font-mono">
                  ₹{Math.round(Number(patient.amount)).toLocaleString()}
                </td>
              </tr>
            ))}
            {sortedPatients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-gray-600">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
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