'use client';

import { useState } from 'react';
import { MessageChannel, MessageType } from '@intellident/api/src/types';
import { useClinic } from '@/context/ClinicContext';

interface Props {
  patientId: number;
  patientName: string;
  phone: string | undefined;
  onClose: () => void;
  onSent: () => void;
}

const TEMPLATES: { type: MessageType; label: string }[] = [
  { type: 'appointment_reminder', label: 'Appointment reminder' },
  { type: 'followup', label: 'Follow-up check' },
  { type: 'balance_due', label: 'Payment reminder' },
  { type: 'custom', label: 'Custom message' },
];

export default function SendMessageDialog({ patientId, patientName, phone, onClose, onSent }: Props) {
  const { clinic } = useClinic();
  const firstName = patientName.split(' ')[0];

  const [channel, setChannel] = useState<MessageChannel>('whatsapp');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageType>('appointment_reminder');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Appointment reminder fields (maps to template {{1}}–{{5}})
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [visitType, setVisitType] = useState('Consultation');

  const isApptReminder = selectedTemplate === 'appointment_reminder';
  const isCustom = selectedTemplate === 'custom';
  const needsApptFields = isApptReminder && channel === 'whatsapp';

  function buildTemplateParams(): string[] | undefined {
    if (!isApptReminder) return undefined;
    const clinicName = clinic?.clinic_name || 'our clinic';
    const date = apptDate ? new Date(apptDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    const [h, m] = apptTime ? apptTime.split(':').map(Number) : [0, 0];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const timeStr = apptTime ? `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}` : '';
    return [firstName, clinicName, visitType, date, timeStr];
  }

  function buildPreviewBody(): string {
    const clinicName = clinic?.clinic_name || 'our clinic';
    switch (selectedTemplate) {
      case 'appointment_reminder': {
        const date = apptDate ? new Date(apptDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '[date]';
        const [h, m] = apptTime ? apptTime.split(':').map(Number) : [0, 0];
        const ampm = h >= 12 ? 'PM' : 'AM';
        const time = apptTime ? `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}` : '[time]';
        return `Hi ${firstName},\n\nThank you for consulting with ${clinicName}.\n\nYour dentist appointment for ${visitType} on ${date} at ${time} is confirmed.`;
      }
      case 'followup':
        return `Hi ${firstName}, we hope you're recovering well after your recent visit. Let us know if you have any concerns or discomfort.`;
      case 'balance_due':
        return `Hi ${firstName}, you have an outstanding balance at ${clinicName}. Please contact us at your earliest convenience to clear the dues. Thank you.`;
      default:
        return message;
    }
  }

  const previewBody = buildPreviewBody();

  async function handleSend() {
    if (!phone) { setError('Patient has no phone number on file'); return; }
    if (isCustom && !message.trim()) { setError('Message cannot be empty'); return; }
    if (needsApptFields && (!apptDate || !apptTime)) { setError('Please enter appointment date and time'); return; }

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          phone,
          channel,
          message_type: selectedTemplate,
          message: isCustom ? message : previewBody,
          template_params: buildTemplateParams(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      onSent();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Send Message</h2>
            <p className="text-xs text-gray-500 mt-0.5">{patientName}{phone ? ` · ${phone}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Channel selector */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Channel</label>
            <div className="grid grid-cols-2 gap-2">
              {(['whatsapp', 'sms'] as MessageChannel[]).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    channel === ch
                      ? ch === 'whatsapp'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}>
                  {ch === 'whatsapp' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )}
                  {ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                </button>
              ))}
            </div>
          </div>

          {/* Template selector */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Template</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATES.map(tpl => (
                <button key={tpl.type} onClick={() => setSelectedTemplate(tpl.type)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    selectedTemplate === tpl.type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Appointment fields — shown when reminder + WhatsApp selected */}
          {needsApptFields && (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Appointment details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold block mb-1">Date</label>
                  <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold block mb-1">Time</label>
                  <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-semibold block mb-1">Visit type</label>
                <select value={visitType} onChange={e => setVisitType(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                  {['Consultation', 'Cleaning', 'Filling', 'Root Canal', 'Extraction', 'Braces', 'Crown', 'Implant', 'Whitening', 'X-Ray', 'Other'].map(v => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Custom message textarea */}
          {isCustom && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                placeholder="Type your message..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">{message.length} chars</span>
                {channel === 'sms' && message.length > 0 && (
                  <span className="text-[10px] text-gray-400">{Math.ceil(message.length / 160)} segment{Math.ceil(message.length / 160) > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          )}

          {/* Preview for non-custom templates */}
          {!isCustom && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Preview</label>
              <div className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg whitespace-pre-line leading-relaxed">
                {previewBody}
              </div>
              {channel === 'whatsapp' && selectedTemplate !== 'appointment_reminder' && (
                <p className="text-[10px] text-amber-500 mt-1.5">WhatsApp requires an approved template — will fall back to SMS if not configured.</p>
              )}
            </div>
          )}

          {/* No phone warning */}
          {!phone && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              No phone number on file — add one in Edit profile first
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || !phone}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5">
            {sending ? (
              <>
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send via {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
