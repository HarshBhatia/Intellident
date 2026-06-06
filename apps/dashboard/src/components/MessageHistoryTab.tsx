'use client';

import { useEffect, useState, useCallback } from 'react';
import { PatientMessage } from '@intellident/api/src/types';

interface Props {
  patientId: number;
  onSendClick: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  custom: 'Custom',
  appointment_reminder: 'Appt. Reminder',
  balance_due: 'Payment Reminder',
  followup: 'Follow-up',
};

export default function MessageHistoryTab({ patientId, onSendClick }: Props) {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?patient_id=${patientId}`);
      if (res.ok) setMessages(await res.json());
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message History</h3>
        <button onClick={onSendClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          New message
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No messages yet</p>
          <p className="text-xs text-gray-400 mt-1">Send a WhatsApp or SMS message to this patient</p>
          <button onClick={onSendClick}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Send first message
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Channel badge */}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    msg.channel === 'whatsapp'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {msg.channel === 'whatsapp' ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    ) : (
                      <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    )}
                    {msg.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                  </span>

                  {/* Type badge */}
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                    {TYPE_LABELS[msg.message_type] || msg.message_type}
                  </span>
                </div>

                {/* Status + time */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold ${
                    msg.status === 'sent' ? 'text-green-500' : msg.status === 'failed' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {msg.status === 'sent' ? '✓ Sent' : msg.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {msg.created_at ? new Date(msg.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{msg.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
