'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/context/ClinicContext';
import type { Appointment, AppointmentStatus, Patient } from '@/types';
import { Analytics } from '@/lib/analytics';

// ============================================================================
// Constants
// ============================================================================

const SLOT_START = 9; // 9 AM
const SLOT_END = 18;  // 6 PM
const SLOT_HEIGHT = 60; // px per 30-min slot

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  COMPLETED: { label: 'Completed', bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  NO_SHOW: { label: 'No Show', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
};

const NEXT_STATUSES: Record<string, { label: string; status: AppointmentStatus; color: string }[]> = {
  SCHEDULED: [
    { label: 'Confirm', status: 'CONFIRMED', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Cancel', status: 'CANCELLED', color: 'bg-red-600 hover:bg-red-700' },
    { label: 'No Show', status: 'NO_SHOW', color: 'bg-orange-600 hover:bg-orange-700' },
  ],
  CONFIRMED: [
    { label: 'Start', status: 'IN_PROGRESS', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { label: 'Cancel', status: 'CANCELLED', color: 'bg-red-600 hover:bg-red-700' },
    { label: 'No Show', status: 'NO_SHOW', color: 'bg-orange-600 hover:bg-orange-700' },
  ],
  IN_PROGRESS: [
    { label: 'Complete', status: 'COMPLETED', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Cancel', status: 'CANCELLED', color: 'bg-red-600 hover:bg-red-700' },
  ],
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Generate time options in 30-min increments
function generateTimeOptions(startHour: number, endHour: number): string[] {
  const options: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    options.push(`${h.toString().padStart(2, '0')}:00`);
    options.push(`${h.toString().padStart(2, '0')}:30`);
  }
  options.push(`${endHour.toString().padStart(2, '0')}:00`);
  return options;
}

const TIME_OPTIONS = generateTimeOptions(SLOT_START, SLOT_END);

// ============================================================================
// Main Component
// ============================================================================

export default function SchedulerClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { doctors } = useClinic();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [doctorFilter, setDoctorFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [highlightedDates, setHighlightedDates] = useState<Set<string>>(new Set());
  const [monthOffset, setMonthOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('list');

  // ---- Data Fetching ----

  const fetchAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (doctorFilter) params.set('doctor', doctorFilter);
      const res = await fetch(`/api/appointments?${params}`);
      if (res.status === 401) { router.push('/sign-in'); return; }
      if (res.ok) setAppointments(await res.json());
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, doctorFilter, router]);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) setPatients(await res.json());
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetchAppointments();
    }
  }, [user?.id, fetchAppointments]);

  useEffect(() => {
    if (user?.id) fetchPatients();
  }, [user?.id, fetchPatients]);

  // Fetch dates with appointments for the mini calendar
  const calendarMonth = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const base = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
    return { year: base.getFullYear(), month: base.getMonth() + 1 };
  }, [selectedDate, monthOffset]);

  const fetchHighlightedDates = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        year: calendarMonth.year.toString(),
        month: calendarMonth.month.toString(),
      });
      if (doctorFilter) params.set('doctor', doctorFilter);
      const res = await fetch(`/api/appointments/dates?${params}`);
      if (res.ok) {
        const dates: string[] = await res.json();
        setHighlightedDates(new Set(dates));
      }
    } catch (error) {
      console.error('Error fetching appointment dates:', error);
    }
  }, [calendarMonth.year, calendarMonth.month, doctorFilter]);

  useEffect(() => {
    if (user?.id) fetchHighlightedDates();
  }, [user?.id, fetchHighlightedDates]);

  // ---- Actions ----

  const handleStatusChange = async (appointmentId: number, status: AppointmentStatus) => {
    try {
      const res = await fetch('/api/appointments/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      Analytics.appointmentStatusChanged({ status });
      showToast(`Appointment ${STATUS_CONFIG[status].label.toLowerCase()}`, 'success');
      setSelectedAppointment(null);
      fetchAppointments();
      fetchHighlightedDates();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this appointment?')) return;
    try {
      const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      showToast('Appointment deleted', 'success');
      setSelectedAppointment(null);
      fetchAppointments();
      fetchHighlightedDates();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete', 'error');
    }
  };

  const isToday = selectedDate === formatDate(new Date());

  // ---- Timeline Slots ----

  const slots = useMemo(() => {
    const result: string[] = [];
    for (let h = SLOT_START; h < SLOT_END; h++) {
      result.push(`${h.toString().padStart(2, '0')}:00`);
      result.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return result;
  }, []);

  const totalSlots = slots.length;
  const timelineStart = SLOT_START * 60;

  // ---- Render ----

  if (!user?.id) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.user_email} value={d.user_email}>
                  {d.display_name || d.user_email}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setSelectedAppointment(null); setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Appointment
          </button>
        </div>

        {/* Main layout: Calendar sidebar + Timeline */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mini Month Calendar */}
          <div className="shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-20">
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                highlightedDates={highlightedDates}
                monthOffset={monthOffset}
                onMonthOffsetChange={setMonthOffset}
              />
            </div>
          </div>

          {/* Day view */}
          <div className="flex-1 min-w-0">
            {/* Date display + view toggle */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDisplayDate(new Date(selectedDate + 'T00:00:00'))}
                {isToday && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">Today</span>}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
                </span>
              </p>
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Timeline view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5h11M9 12h11M9 19h11M5 5h.01M5 12h.01M5 19h.01" /></svg>
                </button>
              </div>
            </div>

            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : viewMode === 'list' ? (
              /* ---- List View ---- */
              appointments.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 py-16 flex flex-col items-center justify-center text-center">
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No appointments this date</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click &ldquo;New Appointment&rdquo; to schedule one</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.map((appt) => {
                    const config = STATUS_CONFIG[appt.status];
                    const displayName = appt.patient_id ? (appt.patient_name || 'Patient') : `Walk-in: ${appt.walk_in_name || 'Unknown'}`;
                    return (
                      <div
                        key={appt.id}
                        onClick={() => setSelectedAppointment(appt)}
                        className={`bg-white dark:bg-gray-900 rounded-xl border px-4 py-3 cursor-pointer transition-shadow hover:shadow-md ${config.border}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0 text-sm font-mono text-gray-500 dark:text-gray-400 w-24">
                              {appt.start_time} &ndash; {appt.end_time}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {appt.visit_type}{appt.doctor_name ? ` \u00b7 ${appt.doctor_name}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ---- Timeline View ---- */
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="relative" style={{ height: totalSlots * SLOT_HEIGHT }}>
                  {/* Time slot lines */}
                  {slots.map((time, i) => {
                    const isHour = time.endsWith(':00');
                    return (
                      <div
                        key={time}
                        className="absolute left-0 right-0 flex items-start"
                        style={{ top: i * SLOT_HEIGHT }}
                      >
                        <div className={`w-16 sm:w-20 shrink-0 text-right pr-3 pt-1 text-xs font-medium ${isHour ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                          {time}
                        </div>
                        <div className={`flex-1 border-t ${isHour ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800'}`} style={{ height: SLOT_HEIGHT }} />
                      </div>
                    );
                  })}

                  {/* Appointment blocks */}
                  {appointments.map((appt) => {
                    const startMin = timeToMinutes(appt.start_time) - timelineStart;
                    const endMin = timeToMinutes(appt.end_time) - timelineStart;
                    const top = (startMin / 30) * SLOT_HEIGHT;
                    const height = Math.max(((endMin - startMin) / 30) * SLOT_HEIGHT - 4, SLOT_HEIGHT - 4);
                    const config = STATUS_CONFIG[appt.status];
                    const displayName = appt.patient_id ? (appt.patient_name || 'Patient') : `Walk-in: ${appt.walk_in_name || 'Unknown'}`;

                    return (
                      <div
                        key={appt.id}
                        className={`absolute left-16 sm:left-20 right-3 rounded-lg border px-3 py-1.5 cursor-pointer transition-shadow hover:shadow-md ${config.bg} ${config.border}`}
                        style={{ top: top + 2, height }}
                        onClick={() => setSelectedAppointment(appt)}
                      >
                        <div className="flex items-start justify-between gap-2 h-full overflow-hidden">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${config.text}`}>{displayName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {appt.visit_type}{appt.doctor_name ? ` \u00b7 ${appt.doctor_name}` : ''}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${config.text}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetail
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={(appt) => { setSelectedAppointment(null); setShowModal(true); setSelectedAppointment(appt); }}
        />
      )}

      {/* New / Edit Appointment Modal */}
      {showModal && (
        <AppointmentModal
          appointment={selectedAppointment}
          patients={patients}
          doctors={doctors}
          selectedDate={selectedDate}
          onClose={() => { setShowModal(false); setSelectedAppointment(null); }}
          onSaved={() => { setShowModal(false); setSelectedAppointment(null); fetchAppointments(); fetchHighlightedDates(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ============================================================================
// Mini Month Calendar
// ============================================================================

function MiniCalendar({
  selectedDate,
  onSelectDate,
  highlightedDates,
  monthOffset,
  onMonthOffsetChange,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  highlightedDates: Set<string>;
  monthOffset: number;
  onMonthOffsetChange: (offset: number) => void;
}) {
  // 'days' = normal day grid, 'months' = month picker, 'years' = year picker
  const [pickerMode, setPickerMode] = useState<'days' | 'months' | 'years'>('days');

  const { viewYear, viewMonth } = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const base = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
    return { viewYear: base.getFullYear(), viewMonth: base.getMonth() };
  }, [selectedDate, monthOffset]);

  const todayStr = formatDate(new Date());
  const todayDate = new Date();
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');

  // Compute the month offset for a given year/month
  const getOffsetForYearMonth = (year: number, month: number) => {
    const selDate = new Date(selectedDate + 'T00:00:00');
    return (year - selDate.getFullYear()) * 12 + (month - selDate.getMonth());
  };

  const handleMonthPick = (month: number) => {
    onMonthOffsetChange(getOffsetForYearMonth(viewYear, month));
    setPickerMode('days');
  };

  const handleYearPick = (year: number) => {
    onMonthOffsetChange(getOffsetForYearMonth(year, viewMonth));
    setPickerMode('months');
  };

  const handleTodayClick = () => {
    onSelectDate(formatDate(new Date()));
    onMonthOffsetChange(0);
    setPickerMode('days');
  };

  // --- Year picker ---
  if (pickerMode === 'years') {
    const startYear = viewYear - 4;
    const years = Array.from({ length: 12 }, (_, i) => startYear + i);
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => onMonthOffsetChange(monthOffset - 12 * 12)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {years[0]} &ndash; {years[years.length - 1]}
          </span>
          <button onClick={() => onMonthOffsetChange(monthOffset + 12 * 12)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {years.map((y) => {
            const isCurrent = y === todayDate.getFullYear();
            const isViewing = y === viewYear;
            return (
              <button
                key={y}
                onClick={() => handleYearPick(y)}
                className={`py-2.5 rounded-lg text-sm transition-colors
                  ${isViewing
                    ? 'bg-blue-600 text-white font-bold'
                    : isCurrent
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {y}
              </button>
            );
          })}
        </div>
        <button onClick={handleTodayClick} className="mt-3 w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium py-1">
          Today
        </button>
      </div>
    );
  }

  // --- Month picker ---
  if (pickerMode === 'months') {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const monthNames = months.map((m) => new Date(2000, m).toLocaleDateString('en-IN', { month: 'short' }));
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => onMonthOffsetChange(monthOffset - 12)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setPickerMode('years')} className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {viewYear}
          </button>
          <button onClick={() => onMonthOffsetChange(monthOffset + 12)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {months.map((m) => {
            const isCurrent = viewYear === todayDate.getFullYear() && m === todayDate.getMonth();
            const isViewing = m === viewMonth;
            const isSelectedMonth = viewYear === selectedDateObj.getFullYear() && m === selectedDateObj.getMonth();
            return (
              <button
                key={m}
                onClick={() => handleMonthPick(m)}
                className={`py-2.5 rounded-lg text-sm transition-colors
                  ${isSelectedMonth
                    ? 'bg-blue-600 text-white font-bold'
                    : isViewing
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                      : isCurrent
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {monthNames[m]}
              </button>
            );
          })}
        </div>
        <button onClick={handleTodayClick} className="mt-3 w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium py-1">
          Today
        </button>
      </div>
    );
  }

  // --- Day grid (default) ---
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-IN', { month: 'long' });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onMonthOffsetChange(monthOffset - 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setPickerMode('months')} className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          {monthName} {viewYear}
        </button>
        <button onClick={() => onMonthOffsetChange(monthOffset + 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;

          const dateStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isDayToday = dateStr === todayStr;
          const hasAppointments = highlightedDates.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative h-9 w-full flex items-center justify-center rounded-lg text-sm transition-colors
                ${isSelected
                  ? 'bg-blue-600 text-white font-bold'
                  : isDayToday
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {day}
              {hasAppointments && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
              )}
              {hasAppointments && isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <button onClick={handleTodayClick} className="mt-3 w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium py-1">
        Today
      </button>
    </div>
  );
}

// ============================================================================
// Appointment Detail Modal
// ============================================================================

function AppointmentDetail({
  appointment,
  onClose,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
  onDelete: (id: number) => void;
  onEdit: (appt: Appointment) => void;
}) {
  const config = STATUS_CONFIG[appointment.status];
  const actions = NEXT_STATUSES[appointment.status] || [];
  const canEdit = ['SCHEDULED', 'CONFIRMED'].includes(appointment.status);
  const displayName = appointment.patient_id
    ? (appointment.patient_name || 'Patient')
    : `Walk-in: ${appointment.walk_in_name || 'Unknown'}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-lg">Appointment Details</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${config.bg} ${config.text}`}>
              {config.label}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Patient</p>
            <p className="font-medium">{displayName}</p>
            {appointment.walk_in_phone && (
              <p className="text-sm text-gray-500">{appointment.walk_in_phone}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
              <p className="font-medium">{appointment.start_time} - {appointment.end_time}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
              <p className="font-medium">{appointment.visit_type || 'Consultation'}</p>
            </div>
          </div>

          {appointment.doctor_name && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Doctor</p>
              <p className="font-medium">{appointment.doctor_name}</p>
            </div>
          )}

          {appointment.notes && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}

          {appointment.visit_id && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-sm text-green-700 dark:text-green-300">
              Visit record created (ID: {appointment.visit_id})
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => onStatusChange(appointment.id!, action.status)}
              className={`${action.color} text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors`}
            >
              {action.label}
            </button>
          ))}
          {canEdit && (
            <>
              <button
                onClick={() => onEdit(appointment)}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(appointment.id!)}
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// New / Edit Appointment Modal
// ============================================================================

function AppointmentModal({
  appointment,
  patients,
  doctors,
  selectedDate,
  onClose,
  onSaved,
  showToast,
}: {
  appointment: Appointment | null;
  patients: Patient[];
  doctors: { user_email: string; display_name?: string }[];
  selectedDate: string;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}) {
  const isEdit = appointment?.id != null;
  const [mode, setMode] = useState<'patient' | 'walkin'>(appointment?.walk_in_name ? 'walkin' : 'patient');
  const [patientSearch, setPatientSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    patient_id: appointment?.patient_id ?? null as number | null,
    patient_display: appointment?.patient_name || '',
    walk_in_name: appointment?.walk_in_name || '',
    walk_in_phone: appointment?.walk_in_phone || '',
    doctor_email: appointment?.doctor_email || '',
    doctor_name: appointment?.doctor_name || '',
    date: appointment?.date || selectedDate,
    start_time: appointment?.start_time || '09:00',
    end_time: appointment?.end_time || '09:30',
    visit_type: appointment?.visit_type || 'Consultation',
    notes: appointment?.notes || '',
  });

  const filteredPatients = useMemo(() => {
    if (!patientSearch || patientSearch.length < 2) return [];
    const term = patientSearch.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(term) || p.phone_number?.includes(term) || p.patient_id.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [patientSearch, patients]);

  const selectDoctor = (email: string) => {
    const doc = doctors.find(d => d.user_email === email);
    setForm(f => ({ ...f, doctor_email: email, doctor_name: doc?.display_name || email }));
  };

  const handleSubmit = async () => {
    if (mode === 'patient' && !form.patient_id) {
      showToast('Please select a patient', 'error');
      return;
    }
    if (mode === 'walkin' && !form.walk_in_name.trim()) {
      showToast('Please enter walk-in patient name', 'error');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string | number | null> = {
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        visit_type: form.visit_type,
        notes: form.notes,
        doctor_email: form.doctor_email || null,
        doctor_name: form.doctor_name || null,
        patient_id: mode === 'patient' ? form.patient_id : null,
        walk_in_name: mode === 'walkin' ? form.walk_in_name : null,
        walk_in_phone: mode === 'walkin' ? form.walk_in_phone : null,
      };

      if (isEdit) body.id = appointment!.id!;

      const res = await fetch('/api/appointments', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      if (!isEdit) Analytics.appointmentCreated({ walkIn: mode === 'walkin', visitType: form.visit_type });
      showToast(isEdit ? 'Appointment updated' : 'Appointment created', 'success');
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save appointment', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 z-10">
          <h3 className="font-semibold text-lg">{isEdit ? 'Edit Appointment' : 'New Appointment'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Patient Mode Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Patient</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode('patient')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'patient' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Existing Patient
              </button>
              <button
                onClick={() => setMode('walkin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'walkin' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Walk-in
              </button>
            </div>

            {mode === 'patient' ? (
              <div className="relative">
                {form.patient_id ? (
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium flex-1">{form.patient_display}</span>
                    <button
                      onClick={() => { setForm(f => ({ ...f, patient_id: null, patient_display: '' })); setPatientSearch(''); }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Search by name, phone, or ID..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
                    />
                    {filteredPatients.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredPatients.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setForm(f => ({ ...f, patient_id: p.id!, patient_display: `${p.name} (${p.patient_id})` }));
                              setPatientSearch('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-400 ml-2">{p.patient_id}</span>
                            {p.phone_number && <span className="text-gray-400 ml-2">{p.phone_number}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={form.walk_in_name}
                  onChange={(e) => setForm(f => ({ ...f, walk_in_name: e.target.value }))}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={form.walk_in_phone}
                  onChange={(e) => setForm(f => ({ ...f, walk_in_phone: e.target.value }))}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-sm font-medium mb-1">Doctor</label>
            <select
              value={form.doctor_email}
              onChange={(e) => selectDoctor(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select Doctor</option>
              {doctors.map((d) => (
                <option key={d.user_email} value={d.user_email}>{d.display_name || d.user_email}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start</label>
              <select
                value={form.start_time}
                onChange={(e) => {
                  const start = e.target.value;
                  setForm(f => {
                    // Auto-advance end time if start >= end
                    const idx = TIME_OPTIONS.indexOf(start);
                    const end = f.end_time <= start && idx < TIME_OPTIONS.length - 1 ? TIME_OPTIONS[idx + 1] : f.end_time;
                    return { ...f, start_time: start, end_time: end };
                  });
                }}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End</label>
              <select
                value={form.end_time}
                onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
              >
                {TIME_OPTIONS.filter(t => t > form.start_time).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Visit Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Visit Type</label>
            <input
              type="text"
              value={form.visit_type}
              onChange={(e) => setForm(f => ({ ...f, visit_type: e.target.value }))}
              placeholder="e.g., Consultation, Cleaning, Root Canal"
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes..."
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
