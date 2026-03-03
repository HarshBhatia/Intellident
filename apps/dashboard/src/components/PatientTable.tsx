'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Patient } from '@/types';
import { useToast } from '@/components/ToastProvider';
import Skeleton from '@/components/Skeleton';
import Link from 'next/link';

interface PatientTableProps {
  patients: Patient[];
  onAddClick?: () => void;
  onDeleteSuccess?: () => void;
}

type SortKey = keyof Patient | 'last_visit';
type SortDirection = 'asc' | 'desc';

export default function PatientTable({ patients, onAddClick, onDeleteSuccess }: PatientTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'patient_id',
    direction: 'desc'
  });

  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const itemsPerPage = 10;

  // Sync page to URL - Silent update to prevent full page refresh
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [currentPage]);

  useEffect(() => { setCurrentPage(1); }, [sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(curr => ({ key, direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedPatients = useMemo(() => {
    const sorted = [...patients];
    sorted.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      if (sortConfig.key === 'age') { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal, undefined, { numeric: true }) 
            : bVal.localeCompare(aVal, undefined, { numeric: true });
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [patients, sortConfig]);

  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPatients.slice(start, start + itemsPerPage);
  }, [sortedPatients, currentPage]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortConfig.key !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm bg-white dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">Actions</th>
              <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('patient_id')}>ID <SortIcon col="patient_id" /></th>
              <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('name')}>Name <SortIcon col="name" /></th>
              <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('age')}>Age <SortIcon col="age" /></th>
              <th className="px-6 py-4">Gender</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Last Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedPatients.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors" onClick={() => router.push(`/patients/${p.patient_id}/`)}>
                <td className="px-6 py-4"><button className="text-blue-600 font-bold text-xs" onClick={(e) => { e.stopPropagation(); /* Msg logic */ }}>MESSAGE</button></td>
                <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{p.patient_id}</td>
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{p.name}</td>
                <td className="px-6 py-4">{p.age}</td>
                <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{p.gender}</td>
                <td className="px-6 py-4 font-mono">{p.phone_number}</td>
                <td className="px-6 py-4">{p.last_visit ? new Date(p.last_visit).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="p-4 border-t dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
          <span className="text-xs text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1 border rounded text-xs font-bold disabled:opacity-30">Prev</button>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1 border rounded text-xs font-bold disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
