'use client';

import { Patient } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';

interface PatientTableProps {
  patients: Patient[];
}

type SortKey = 'name' | 'age' | 'amount' | 'date';
type SortDirection = 'asc' | 'desc';

interface MessageModalProps {
  patient: Patient;
  clinicName: string;
  googleMapsLink: string;
  onClose: () => void;
  initialType: 'whatsapp' | 'sms';
}

function MessageModal({ patient, clinicName, googleMapsLink, onClose, initialType }: MessageModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<'reminder' | 'review' | 'payment'>('reminder');
  const [messageType, setMessageType] = useState<'whatsapp' | 'sms'>(initialType);
  const [customMessage, setCustomMessage] = useState('');
  
  const templates = useMemo(() => ({
    reminder: `Hi ${patient.name}, this is a reminder regarding your visit to ${clinicName || 'our clinic'}.`,
    review: `Hi ${patient.name}, we hope you had a great experience at ${clinicName || 'our clinic'}. We would love it if you could leave us a review on Google: ${googleMapsLink}`,
    payment: `Hi ${patient.name}, a payment of ₹${patient.amount.toLocaleString()} is pending for your recent treatment at ${clinicName || 'our clinic'}. You can pay via UPI or cash.`
  }), [patient, clinicName, googleMapsLink]);

  useEffect(() => {
    setCustomMessage(templates[selectedTemplate]);
  }, [selectedTemplate, templates]);

  const handleSend = () => {
    const phone = patient.phone_number?.replace(/\D/g, '');
    if (messageType === 'whatsapp') {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(customMessage)}`, '_blank');
    } else {
      window.location.href = `sms:${patient.phone_number}?&body=${encodeURIComponent(customMessage)}`;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Communication</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Send via</label>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button 
                onClick={() => setMessageType('whatsapp')}
                className={`flex-1 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 ${messageType === 'whatsapp' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </button>
              <button 
                onClick={() => setMessageType('sms')}
                className={`flex-1 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 ${messageType === 'sms' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                SMS
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Template</label>
            <div className="grid grid-cols-3 gap-2">
              {(['reminder', 'review', 'payment'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setSelectedTemplate(t)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold capitalize transition ${selectedTemplate === t ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message Text</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[120px] resize-none"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-lg">Cancel</button>
          <button onClick={handleSend} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">Send Now</button>
        </div>
      </div>
    </div>
  );
}

export default function PatientTable({ patients }: PatientTableProps) {
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  const searchParams = useSearchParams();
  const [clinic, setClinic] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<{ patient: Patient; type: 'whatsapp' | 'sms' } | null>(null);

  // Pagination State - Init from URL
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetch('/api/clinic-info')
      .then(res => res.json())
      .then(data => setClinic(data));
  }, []);

  // Sync page to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    
    if (params.get('page') !== searchParams.get('page')) {
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [currentPage, router, searchParams]);

  // Reset to page 1 when sorting or filtering changes
  useEffect(() => {
    // Only reset if we are not currently at page 1
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [sortConfig, patients]);

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
      
      // Handle string comparisons with natural sort order for IDs
      if (typeof aValue === 'string' && typeof bValue === 'string') {
          const compareResult = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
          return sortConfig.direction === 'asc' ? compareResult : -compareResult;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [patients, sortConfig]);

  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedPatients, currentPage, itemsPerPage]);

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

  const googleMapsLink = clinic?.google_maps_link || 'https://maps.app.goo.gl/WrFdUEL98qJXemM66';

  return (
    <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-900 text-sm text-left text-gray-600 dark:text-gray-400 transition-colors">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b dark:border-gray-800">Actions</th>
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
            {paginatedPatients.map((patient) => (
              <tr 
                key={patient.id} 
                className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition duration-150 cursor-pointer group"
                onClick={() => router.push(`/patients/${patient.patient_id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <div className="relative group/tooltip">
                      <button 
                        onClick={() => patient.phone_number && setActiveModal({ patient, type: 'whatsapp' })}
                        disabled={!patient.phone_number}
                        className={`p-1.5 rounded-md transition ${
                          patient.phone_number 
                            ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                            : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                        }`}
                        title={patient.phone_number ? "Send Message" : ""}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      </button>
                      {!patient.phone_number && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xl z-[10]">
                          No Phone
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => router.push(`/patients/${patient.patient_id}?edit=true`)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-md transition"
                      title="Edit Patient"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                    </button>
                  </div>
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
            {paginatedPatients.length === 0 && (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Showing <span className="font-bold text-gray-700 dark:text-gray-200">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-700 dark:text-gray-200">{Math.min(currentPage * itemsPerPage, sortedPatients.length)}</span> of <span className="font-bold text-gray-700 dark:text-gray-200">{sortedPatients.length}</span> patients
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-xs font-bold bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="flex items-center px-4 text-xs font-bold text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-xs font-bold bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeModal && (
        <MessageModal 
          patient={activeModal.patient}
          initialType={activeModal.type}
          clinicName={clinic?.clinic_name}
          googleMapsLink={googleMapsLink}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}