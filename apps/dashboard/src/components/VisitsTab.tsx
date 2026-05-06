'use client';

import { useState, useMemo } from 'react';
import { Visit, BillingItem } from '@/types';

interface VisitsTabProps {
  visits: Visit[];
  onNewVisit: () => void;
  onEditVisit: (visit: Visit) => void;
  onDeleteVisit: (id: number) => void;
}

type FilterKey = 'all' | 'completed' | 'pending' | 'unpaid';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return {
      day: d.getDate(),
      month: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
      year: d.getFullYear(),
      full: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
  } catch {
    return { day: '—', month: '—', year: '—', full: dateStr };
  }
}

function Waveform({ count = 32 }: { count?: number }) {
  const heights = useMemo(() => Array.from({ length: count }, () => 4 + Math.random() * 12), [count]);
  return (
    <div className="flex items-center gap-px h-4">
      {heights.map((h, i) => (
        <span key={i} style={{ width: 2, height: h, background: i < count * 0.3 ? '#2563eb' : '#cbd5e1', borderRadius: 1, display: 'inline-block' }} />
      ))}
    </div>
  );
}

function VisitCard({
  visit, expanded, onToggle, onEdit, onDelete,
}: {
  visit: Visit;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (v: Visit) => void;
  onDelete: (id: number) => void;
}) {
  const date = formatDate(visit.date);
  const cost = Number(visit.cost || 0);
  const paid = Number(visit.paid || 0);
  const due  = cost - paid;
  const payStatus = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  const payLabel  = due <= 0 ? 'Paid in full' : `₹${due.toLocaleString('en-IN')} due`;

  // Parse teeth from tooth_number (comma-separated)
  const teeth = useMemo(() => {
    if (!visit.tooth_number) return [];
    return visit.tooth_number.split(',').map(t => t.trim()).filter(Boolean);
  }, [visit.tooth_number]);

  // Parse billing items for procedures
  const billingItems: BillingItem[] = useMemo(() => {
    if (!visit.billing_items) return [];
    if (Array.isArray(visit.billing_items)) return visit.billing_items;
    try { return JSON.parse(visit.billing_items as unknown as string) || []; } catch { return []; }
  }, [visit.billing_items]);

  const xrays: { url: string; name: string }[] = useMemo(() => {
    try {
      const parsed = visit.xrays ? JSON.parse(visit.xrays) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [visit.xrays]);

  const dotColor = payStatus === 'unpaid' ? 'border-amber-400' : payStatus === 'partial' ? 'border-amber-400' : 'border-blue-500';

  return (
    <div className={`relative mb-4 bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-all duration-200 ${
      expanded ? 'border-blue-200 dark:border-blue-900 shadow-[0_6px_20px_rgba(37,99,235,0.08)]' : 'border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
    }`}>
      {/* Timeline dot */}
      <div className={`absolute left-[-28px] top-[22px] w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-[3px] ${dotColor} flex items-center justify-center z-10`}>
        <div className={`w-2 h-2 rounded-full ${payStatus === 'paid' ? 'bg-blue-500' : 'bg-amber-400'}`} />
      </div>

      {/* Header (always visible) */}
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={onToggle}>
        {/* Date */}
        <div className="w-14 flex-shrink-0 text-center pr-3 border-r border-gray-100 dark:border-gray-800">
          <div className="text-xl font-black text-gray-900 dark:text-white leading-none">{date.day}</div>
          <div className="text-[10px] font-bold text-gray-500 tracking-widest mt-1">{date.month}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{date.year}</div>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{visit.visit_type}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              payStatus === 'paid' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
              'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            }`}>
              {payStatus === 'paid' ? 'settled' : 'has due'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            {visit.doctor && (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                  {visit.doctor.split(',')[0]?.trim().split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
                {visit.doctor.split(',')[0]?.trim()}
              </span>
            )}
            {teeth.length > 0 && (
              <><span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" /><span>{teeth.length} {teeth.length === 1 ? 'tooth' : 'teeth'}</span></>
            )}
            {billingItems.length > 0 && (
              <><span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" /><span>{billingItems.length} {billingItems.length === 1 ? 'procedure' : 'procedures'}</span></>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-base font-black text-gray-900 dark:text-white tracking-tight">₹{cost.toLocaleString('en-IN')}</div>
            <div className={`text-[11px] font-semibold mt-0.5 ${
              payStatus === 'paid' ? 'text-green-600 dark:text-green-400' :
              payStatus === 'partial' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
            }`}>{payLabel}</div>
          </div>
          <svg className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
          <div className="grid gap-5 p-5" style={{ gridTemplateColumns: '1fr 260px' }}>
            {/* Left column */}
            <div className="space-y-5">
              {/* Teeth treated */}
              {teeth.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Teeth treated</div>
                  <div className="flex flex-wrap gap-2">
                    {teeth.map(t => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold">
                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full text-[10px] font-black">{t}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical note */}
              {visit.clinical_findings && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clinical note</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-500 to-pink-500 text-white">AI</span>
                  </div>
                  <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5">
                    {visit.clinical_findings}
                  </div>
                </div>
              )}

              {/* Voice note (decorative waveform) */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Voice recording</div>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5">
                  <button className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                  <Waveform />
                  <div className="text-right ml-auto">
                    <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Voice note</div>
                    <div className="text-[10px] text-gray-400">{date.full}</div>
                  </div>
                </div>
              </div>

              {/* Procedures */}
              {billingItems.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Procedures</div>
                  <div className="flex flex-col gap-1.5">
                    {billingItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">{item.description}</div>
                        </div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">₹{Number(item.amount || 0).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedure notes (if no billing items) */}
              {!billingItems.length && visit.procedure_notes && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Procedure notes</div>
                  <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5">
                    {visit.procedure_notes}
                  </p>
                </div>
              )}

              {/* Medicine */}
              {visit.medicine_prescribed && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Medicines prescribed</div>
                  <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5">
                    {visit.medicine_prescribed}
                  </p>
                </div>
              )}

              {/* X-ray files */}
              {xrays.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Attached files ({xrays.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {xrays.map((x, i) => (
                      <a key={i} href={x.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {x.name || `X-ray ${i + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column: payment + actions */}
            <div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment</div>
                <div className="flex justify-between items-center py-2 text-sm border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">Total</span>
                  <span className="font-black text-gray-900 dark:text-white text-base">₹{cost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-xs">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">₹{paid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-xs">
                  <span className="text-gray-500">Due</span>
                  <span className={`font-semibold ${due <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₹{Math.max(0, due).toLocaleString('en-IN')}
                  </span>
                </div>
                {due > 0 && (
                  <button className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                    Collect ₹{due.toLocaleString('en-IN')}
                  </button>
                )}
              </div>

              {/* Edit / Delete */}
              <div className="flex gap-2">
                <button onClick={() => onEdit(visit)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
                <button onClick={() => visit.id && onDelete(visit.id)}
                  className="flex items-center justify-center p-2 text-red-400 hover:text-red-600 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-red-50 transition-colors">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VisitsTab({ visits, onNewVisit, onEditVisit, onDeleteVisit }: VisitsTabProps) {
  const [expanded, setExpanded] = useState<number | null>(visits[0]?.id ?? null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...visits];
    if (filter === 'completed') result = result.filter(v => Number(v.cost || 0) <= Number(v.paid || 0));
    if (filter === 'pending')   result = result.filter(v => Number(v.cost || 0) > Number(v.paid || 0));
    if (filter === 'unpaid')    result = result.filter(v => Number(v.cost || 0) > Number(v.paid || 0));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.clinical_findings?.toLowerCase().includes(q) ||
        v.procedure_notes?.toLowerCase().includes(q) ||
        v.visit_type?.toLowerCase().includes(q) ||
        v.doctor?.toLowerCase().includes(q) ||
        v.tooth_number?.includes(q)
      );
    }
    return result;
  }, [visits, filter, search]);

  const totalSpent = useMemo(() => visits.reduce((s, v) => s + Number(v.paid || 0), 0), [visits]);
  const totalDue   = useMemo(() => visits.reduce((s, v) => s + Math.max(0, Number(v.cost || 0) - Number(v.paid || 0)), 0), [visits]);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { num: visits.length,                       label: 'Total visits',      cls: 'text-blue-600 dark:text-blue-400' },
          { num: `₹${totalSpent.toLocaleString('en-IN')}`, label: 'Total collected', cls: 'text-green-600 dark:text-green-400' },
          { num: `₹${totalDue.toLocaleString('en-IN')}`,   label: 'Outstanding',     cls: 'text-amber-600 dark:text-amber-400' },
          { num: visits.length > 0 ? visits[0].date : '—', label: 'Last visit',  cls: 'text-gray-700 dark:text-gray-300' },
        ].map(({ num, label, cls }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3.5">
            <div className={`text-xl font-black tracking-tight leading-none mb-1 truncate ${cls}`}>{num}</div>
            <div className="text-[11px] font-semibold text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-[200px] bg-white dark:bg-gray-800">
            <svg width="14" height="14" fill="none" stroke="#9ca3af" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search visits, notes..."
              className="border-none outline-none flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
          {(['all', 'completed', 'pending', 'unpaid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                filter === f
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}>
              {f === 'all' ? 'All visits' : f === 'completed' ? 'Settled' : f === 'pending' ? 'Pending' : 'Has dues'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ paddingLeft: 32, position: 'relative' }}>
        {/* Rail */}
        <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: 'linear-gradient(180deg, #e5e7eb 0%, #e5e7eb 90%, transparent)', borderRadius: 1 }} />

        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-300 dark:text-gray-600 mx-auto mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-sm font-semibold text-gray-500">No visits match this filter</div>
          </div>
        ) : (
          filtered.map(v => (
            <VisitCard
              key={v.id}
              visit={v}
              expanded={expanded === v.id}
              onToggle={() => setExpanded(expanded === v.id ? null : (v.id ?? null))}
              onEdit={onEditVisit}
              onDelete={onDeleteVisit}
            />
          ))
        )}
      </div>
    </div>
  );
}
