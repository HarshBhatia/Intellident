'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AI_REFRESH_EVENT } from '@/hooks/useRefreshOnAiWrite';

interface UiComponent {
  type: 'patient_card';
  data: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ui?: UiComponent;
}

interface PendingAction {
  method: string;
  path: string;
  body: string | null;
}

const STORAGE_KEY = 'intellident-chat-messages';

// ── Patient card rendered inline in the chat ───────────────────────────────
function PatientCard({ data }: { data: any }) {
  const visits: any[] = data.visits || [];
  const totalPaid = visits.reduce((s: number, v: any) => s + Number(v.paid || 0), 0);
  const totalCost = visits.reduce((s: number, v: any) => s + Number(v.cost || 0), 0);
  const outstanding = Math.max(0, totalCost - totalPaid);
  const lastVisit = visits[0]?.date ?? null;

  const initials = (data.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  const COLORS = ['#0ea5e9','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
  let h = 0;
  for (const c of (data.patient_id || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  const avatarColor = COLORS[Math.abs(h) % COLORS.length];

  return (
    <Link
      href={`/patients/${data.patient_id}`}
      className="block mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{ background: avatarColor }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{data.name}</div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
            <span>{data.patient_id}</span>
            {data.age && <><span>·</span><span>{data.age} yrs</span></>}
            {data.gender && <><span>·</span><span>{data.gender}</span></>}
            {data.phone_number && <><span>·</span><span>{data.phone_number}</span></>}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
        {[
          { label: 'Visits', value: visits.length },
          { label: 'Collected', value: `₹${totalPaid.toLocaleString('en-IN')}` },
          { label: 'Outstanding', value: outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN')}` : '—', red: outstanding > 0 },
        ].map(({ label, value, red }) => (
          <div key={label} className="px-3 py-2 text-center">
            <div className={`text-sm font-bold ${red ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>{value}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>
      {lastVisit && (
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
          Last visit: {lastVisit}
        </div>
      )}
    </Link>
  );
}

// ── Markdown renderer ──────────────────────────────────────────────────────
const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <pre className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 my-2 overflow-x-auto text-xs"><code>{children}</code></pre>
    ) : (
      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">{children}</code>
    );
  },
  h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-200 dark:bg-gray-700">{children}</thead>,
  th: ({ children }) => <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">{children}</td>,
  hr: () => <hr className="my-2 border-gray-300 dark:border-gray-600" />,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-400 pl-2 my-2 text-gray-600 dark:text-gray-400">{children}</blockquote>,
};

// ── Main component ─────────────────────────────────────────────────────────
export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [autoApprove, setAutoApprove] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, pendingAction, scrollToBottom]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsOpen(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Restore open state after hydration (must be a useEffect to avoid SSR mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem('intellident-chat-open') === 'true') setIsOpen(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const root = document.getElementById('layout-root');
    if (root) root.style.paddingRight = isOpen ? '380px' : '0px';
    try { localStorage.setItem('intellident-chat-open', String(isOpen)); } catch { /* ignore */ }
  }, [isOpen]);

  // Restore autoApprove after hydration
  useEffect(() => {
    try {
      if (localStorage.getItem('intellident-chat-auto-approve') === 'true') setAutoApprove(true);
    } catch { /* ignore */ }
  }, []);

  // Persist autoApprove preference
  useEffect(() => {
    try { localStorage.setItem('intellident-chat-auto-approve', String(autoApprove)); } catch { /* ignore */ }
  }, [autoApprove]);

  // Refs so async callbacks always read the latest values without stale closures
  const autoApproveRef = useRef(autoApprove);
  useEffect(() => { autoApproveRef.current = autoApprove; }, [autoApprove]);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Execute a write call and get a one-sentence AI acknowledgment.
  // visibleMessages = the conversation as it should appear at the time of execution.
  const executeAndAcknowledge = useCallback(async (action: PendingAction, visibleMessages: Message[]) => {
    const res = await fetch(action.path, {
      method: action.method,
      headers: { 'Content-Type': 'application/json' },
      body: action.body ?? undefined,
    });
    const resultData = await res.json().catch(() => ({ status: res.status }));
    if (res.ok) {
      router.refresh();
      window.dispatchEvent(new CustomEvent(AI_REFRESH_EVENT));
    }
    const context = res.ok
      ? `[System: ${action.method} ${action.path} succeeded. Response: ${JSON.stringify(resultData)}. Briefly confirm what was done in one sentence.]`
      : `[System: ${action.method} ${action.path} failed (${res.status}): ${JSON.stringify(resultData)}. Explain the error briefly.]`;
    const ackRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...visibleMessages, { role: 'user', content: context }] }),
    });
    if (ackRes.ok) {
      const ackData = await ackRes.json();
      setMessages(prev => [...prev, { role: 'assistant', content: ackData.message, ...(ackData.ui ? { ui: ackData.ui } : {}) }]);
    }
  }, [router]);

  // Core send — apiMessages is what the API receives; visible state gets only the AI reply appended.
  // Auto-approve: intercepts pendingAction before setting state so the card never renders.
  const callApi = useCallback(async (apiMessages: Message[]) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const aiMsg: Message = { role: 'assistant', content: data.message, ...(data.ui ? { ui: data.ui } : {}) };
      setMessages(prev => [...prev, aiMsg]);

      if (data.pendingAction) {
        const isDelete = data.pendingAction.method?.toUpperCase() === 'DELETE';
        if (!isDelete && autoApproveRef.current) {
          // Auto-execute inline — card never shown, loading stays true throughout
          await executeAndAcknowledge(data.pendingAction, [...messagesRef.current, aiMsg]);
        } else {
          setPendingAction(data.pendingAction);
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${err.message || 'Unknown error'}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [executeAndAcknowledge]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || pendingAction) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    callApi(next);
  };

  // Manual confirm — only reached for DELETE or when auto-approve is off
  const confirmAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setIsLoading(true);
    try {
      await executeAndAcknowledge(action, messages);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Failed to execute: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const denyAction = () => {
    const action = pendingAction!;
    setPendingAction(null);
    const context = `[System: The user denied the action ${action.method} ${action.path}. Acknowledge the cancellation briefly.]`;
    callApi([...messages, { role: 'user', content: context }]);
  };

  const clearChat = () => {
    setMessages([]);
    setPendingAction(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const methodColor: Record<string, string> = {
    POST: 'text-green-600 dark:text-green-400',
    PUT: 'text-amber-600 dark:text-amber-400',
    DELETE: 'text-red-600 dark:text-red-400',
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2 py-4 rounded-l-xl transition-colors"
          title="AI Chat (Cmd+K)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wide" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>AI</span>
        </button>
      )}

      <div
        className={`fixed top-0 right-0 h-screen z-50 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '380px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white flex-shrink-0">
          <div>
            <h3 className="font-semibold text-sm">IntelliDent AI</h3>
            <p className="text-[11px] text-blue-100">Ask about patients, visits, or earnings</p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={clearChat} className="text-blue-200 hover:text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition-colors">
                Clear
              </button>
            )}
            <button onClick={() => setIsOpen(false)} className="text-blue-200 hover:text-white p-1 rounded hover:bg-blue-700 transition-colors" title="Close (Cmd+K)">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-400 dark:text-gray-500 mt-12 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Try asking:</p>
              <div className="space-y-2">
                {[
                  'How many patients visited this month?',
                  'Show me details for PID-1',
                  "What are today's appointments?",
                  'Revenue this month vs last month?',
                ].map((q) => (
                  <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300 transition-colors">
                    &ldquo;{q}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md text-sm leading-relaxed bg-blue-600 text-white">
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              ) : (
                <div className="max-w-[95%] px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <div className="chat-markdown break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  {msg.ui?.type === 'patient_card' && <PatientCard data={msg.ui.data} />}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Confirmation card */}
          {pendingAction && !isLoading && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">Confirm action</span>
              </div>
              <div className="font-mono text-xs bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-900 space-y-0.5">
                <div>
                  <span className={`font-bold ${methodColor[pendingAction.method?.toUpperCase()] ?? 'text-gray-600'}`}>
                    {pendingAction.method?.toUpperCase()}
                  </span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">{pendingAction.path}</span>
                </div>
                {pendingAction.body && (
                  <div className="text-gray-500 dark:text-gray-400 break-all">{pendingAction.body}</div>
                )}
              </div>
              <div className="flex gap-2 pt-0.5">
                <button onClick={confirmAction} className="flex-1 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Allow
                </button>
                <button onClick={denyAction} className="flex-1 py-1.5 text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors">
                  Deny
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 pt-3 pb-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-2">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder={pendingAction ? 'Respond to the confirmation above…' : 'Ask about patients, visits…'}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none overflow-hidden leading-relaxed"
              disabled={isLoading || !!pendingAction}
            />
            <button type="submit" disabled={isLoading || !input.trim() || !!pendingAction}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
          <button
            onClick={() => setAutoApprove(v => !v)}
            className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              autoApprove
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:text-gray-600'
            }`}
            title="When on, creates and updates run without confirmation. Deletes always require approval."
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="flex-1 text-left">Auto-approve creates &amp; updates</span>
            <span className={`w-7 h-4 rounded-full flex items-center transition-colors flex-shrink-0 ${autoApprove ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${autoApprove ? 'translate-x-3' : 'translate-x-0'}`} />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
