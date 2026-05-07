'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Visit } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConditionKey =
  | 'caries' | 'filled' | 'crown' | 'rct' | 'missing'
  | 'extraction' | 'implant' | 'bridge' | 'mobility' | 'fractured' | 'sensitive';

interface Condition {
  label: string;
  color: string;
  surface: boolean;
}

interface ToothState {
  surfaces?: { [surface: string]: ConditionKey };
  whole?: ConditionKey;
}

type OdontogramMap = { [toothNum: number]: ToothState };

// FDI → Universal (ADA) mapping
const FDI_TO_UNIVERSAL: Record<number, number> = {
  18:1, 17:2, 16:3, 15:4, 14:5, 13:6, 12:7, 11:8,
  21:9, 22:10, 23:11, 24:12, 25:13, 26:14, 27:15, 28:16,
  38:17, 37:18, 36:19, 35:20, 34:21, 33:22, 32:23, 31:24,
  41:25, 42:26, 43:27, 44:28, 45:29, 46:30, 47:31, 48:32,
};
// Palmer: number within quadrant (1=central, 8=wisdom) + symbol
const PALMER_SYMBOL: Record<number, string> = { 1:'┘', 2:'└', 3:'┐', 4:'┌' };
function toothLabel(fdi: number, notation: 'FDI' | 'Universal' | 'Palmer'): string {
  if (notation === 'Universal') return String(FDI_TO_UNIVERSAL[fdi] ?? fdi);
  if (notation === 'Palmer') {
    const q = Math.floor(fdi / 10);
    const n = fdi % 10;
    return `${n}${PALMER_SYMBOL[q] ?? ''}`;
  }
  return String(fdi);
}

interface PopoverInfo {
  tooth: number;
  surface: string | null;
  position: { x: number; y: number };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FDI_TEETH: { [q: string]: number[] } = {
  Q1: [18, 17, 16, 15, 14, 13, 12, 11],
  Q2: [21, 22, 23, 24, 25, 26, 27, 28],
  Q3: [31, 32, 33, 34, 35, 36, 37, 38],
  Q4: [48, 47, 46, 45, 44, 43, 42, 41],
};

const TOOTH_NAMES: { [n: number]: string } = {
  18: '3rd Molar', 17: '2nd Molar', 16: '1st Molar', 15: '2nd Premolar',
  14: '1st Premolar', 13: 'Canine', 12: 'Lateral Incisor', 11: 'Central Incisor',
  21: 'Central Incisor', 22: 'Lateral Incisor', 23: 'Canine', 24: '1st Premolar',
  25: '2nd Premolar', 26: '1st Molar', 27: '2nd Molar', 28: '3rd Molar',
  31: 'Central Incisor', 32: 'Lateral Incisor', 33: 'Canine', 34: '1st Premolar',
  35: '2nd Premolar', 36: '1st Molar', 37: '2nd Molar', 38: '3rd Molar',
  41: 'Central Incisor', 42: 'Lateral Incisor', 43: 'Canine', 44: '1st Premolar',
  45: '2nd Premolar', 46: '1st Molar', 47: '2nd Molar', 48: '3rd Molar',
};

const CONDITIONS: { [k in ConditionKey]: Condition } = {
  caries:     { label: 'Caries (decay)',      color: '#dc2626', surface: true  },
  filled:     { label: 'Filled',              color: '#3b82f6', surface: true  },
  crown:      { label: 'Crown',               color: '#f59e0b', surface: false },
  rct:        { label: 'Root canal',          color: '#a855f7', surface: false },
  missing:    { label: 'Missing',             color: '#9ca3af', surface: false },
  extraction: { label: 'To be extracted',     color: '#f97316', surface: false },
  implant:    { label: 'Implant',             color: '#06b6d4', surface: false },
  bridge:     { label: 'Bridge',              color: '#0d9488', surface: false },
  mobility:   { label: 'Mobility',            color: '#ec4899', surface: false },
  fractured:  { label: 'Fractured',           color: '#b91c1c', surface: true  },
  sensitive:  { label: 'Sensitive',           color: '#fbbf24', surface: false },
};

const SURFACES = ['occlusal', 'mesial', 'distal', 'buccal', 'lingual'];
const SURFACE_LABEL: { [s: string]: string } = {
  occlusal: 'Occlusal', mesial: 'Mesial', distal: 'Distal',
  buccal: 'Buccal', lingual: 'Lingual',
};

// ─── ToothSVG ────────────────────────────────────────────────────────────────

function ToothSVG({
  toothNum, state, selected, onSurfaceClick, large = false,
}: {
  toothNum: number;
  state?: ToothState;
  selected?: boolean;
  onSurfaceClick?: (surface: string) => void;
  large?: boolean;
}) {
  const isUpper = toothNum >= 11 && toothNum <= 28;
  const q = Math.floor(toothNum / 10);
  const mesialOnRight = q === 1 || q === 4;
  const id = `clip-${toothNum}${large ? '-lg' : ''}`;

  const surfFill = (s: string) => {
    const cond = state?.surfaces?.[s] as ConditionKey | undefined;
    if (!cond) return '#fff';
    return CONDITIONS[cond]?.color || '#fff';
  };

  const whole = state?.whole;
  const wholeColor = whole && CONDITIONS[whole] ? CONDITIONS[whole].color : null;
  const isMissing = whole === 'missing';

  const clickHandler = (surf: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSurfaceClick?.(surf);
  };

  return (
    <svg viewBox="0 0 36 56" style={{ width: '100%', height: '100%' }}>
      <defs>
        <clipPath id={id}>
          <path d="M8 4 Q4 4 4 12 L4 38 Q4 46 8 50 Q12 54 18 54 Q24 54 28 50 Q32 46 32 38 L32 12 Q32 4 28 4 Q24 2 18 2 Q12 2 8 4 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {/* occlusal (center) */}
        <rect x="0" y="0" width="36" height="56" fill={surfFill('occlusal')} onClick={clickHandler('occlusal')} style={{ cursor: 'pointer' }} />
        {/* buccal (top) */}
        <path d="M0 0 L36 0 L36 14 L18 22 L0 14 Z" fill={surfFill('buccal')} onClick={clickHandler('buccal')} style={{ cursor: 'pointer' }} />
        {/* lingual (bottom) */}
        <path d="M0 56 L36 56 L36 42 L18 34 L0 42 Z" fill={surfFill('lingual')} onClick={clickHandler('lingual')} style={{ cursor: 'pointer' }} />
        {/* left (mesial or distal depending on quadrant) */}
        <path d="M0 14 L18 22 L18 34 L0 42 Z"
          fill={mesialOnRight ? surfFill('distal') : surfFill('mesial')}
          onClick={clickHandler(mesialOnRight ? 'distal' : 'mesial')}
          style={{ cursor: 'pointer' }}
        />
        {/* right */}
        <path d="M36 14 L18 22 L18 34 L36 42 Z"
          fill={mesialOnRight ? surfFill('mesial') : surfFill('distal')}
          onClick={clickHandler(mesialOnRight ? 'mesial' : 'distal')}
          style={{ cursor: 'pointer' }}
        />
        {/* divider lines */}
        <g stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" fill="none">
          <path d="M0 0 L18 22" /><path d="M36 0 L18 22" />
          <path d="M0 56 L18 34" /><path d="M36 56 L18 34" />
          <rect x="13" y="22" width="10" height="12" />
        </g>
        {/* whole-tooth overlays */}
        {whole === 'rct' && (
          <g stroke={wholeColor!} strokeWidth="1.5" fill="none" opacity="0.85">
            <path d={isUpper ? 'M14 22 L14 4 M22 22 L22 4 M18 22 L18 4' : 'M14 34 L14 52 M22 34 L22 52 M18 34 L18 52'} strokeLinecap="round" />
          </g>
        )}
        {whole === 'crown' && (
          <g fill={wholeColor!} opacity="0.92">
            <path d={isUpper ? 'M2 0 L34 0 L34 22 Q34 24 32 24 L4 24 Q2 24 2 22 Z' : 'M2 56 L34 56 L34 34 Q34 32 32 32 L4 32 Q2 32 2 34 Z'} />
            <g fill="rgba(0,0,0,0.15)">
              <circle cx="10" cy={isUpper ? 12 : 44} r="1.5" />
              <circle cx="18" cy={isUpper ? 12 : 44} r="1.5" />
              <circle cx="26" cy={isUpper ? 12 : 44} r="1.5" />
            </g>
          </g>
        )}
        {whole === 'implant' && (
          <g stroke={wholeColor!} strokeWidth="1.5" fill="none">
            <path d={isUpper
              ? 'M14 4 L14 22 M18 2 L18 22 M22 4 L22 22 M12 6 L24 6 M12 10 L24 10 M12 14 L24 14 M12 18 L24 18'
              : 'M14 34 L14 52 M18 34 L18 54 M22 34 L22 52 M12 50 L24 50 M12 46 L24 46 M12 42 L24 42 M12 38 L24 38'} />
          </g>
        )}
        {whole === 'extraction' && !isMissing && (
          <g stroke={wholeColor!} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M8 8 L28 48" /><path d="M28 8 L8 48" />
          </g>
        )}
        {whole === 'mobility' && (
          <text x="18" y="32" textAnchor="middle" fontSize="14" fontWeight="700" fill={wholeColor!}>M</text>
        )}
        {whole === 'sensitive' && !state?.surfaces && (
          <text x="18" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill={wholeColor!}>S</text>
        )}
      </g>
      <path
        d="M8 4 Q4 4 4 12 L4 38 Q4 46 8 50 Q12 54 18 54 Q24 54 28 50 Q32 46 32 38 L32 12 Q32 4 28 4 Q24 2 18 2 Q12 2 8 4 Z"
        fill="none"
        stroke={selected ? '#2563eb' : '#94a3b8'}
        strokeWidth={selected ? 2.5 : 1.2}
      />
    </svg>
  );
}

// ─── SurfacePopover ───────────────────────────────────────────────────────────

function SurfacePopover({
  tooth, surface, position, onPick, onClose,
}: {
  tooth: number;
  surface: string | null;
  position: { x: number; y: number };
  onPick: (action: { scope: 'surface' | 'whole' | 'clear'; value?: ConditionKey }) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const surfaceConds = Object.entries(CONDITIONS).filter(([, v]) => v.surface) as [ConditionKey, Condition][];
  const wholeConds   = Object.entries(CONDITIONS).filter(([, v]) => !v.surface) as [ConditionKey, Condition][];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
      <div
        style={{
          position: 'absolute', left: position.x, top: position.y,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)', padding: 12, zIndex: 30,
          minWidth: 260, fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Tooth #{tooth}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{TOOTH_NAMES[tooth]}</div>
          </div>
          {surface && <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 100 }}>{SURFACE_LABEL[surface]}</span>}
        </div>

        {surface && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Surface conditions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
              {surfaceConds.map(([k, v]) => (
                <button key={k} onClick={() => onPick({ scope: 'surface', value: k })}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12, fontWeight: 500, color: '#374151', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: v.color, flexShrink: 0, display: 'inline-block' }} />
                  {v.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', margin: '8px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Whole tooth</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {wholeConds.map(([k, v]) => (
            <button key={k} onClick={() => onPick({ scope: 'whole', value: k })}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12, fontWeight: 500, color: '#374151', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: v.color, flexShrink: 0, display: 'inline-block' }} />
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPick({ scope: 'clear' })}
          style={{ width: '100%', marginTop: 8, padding: '7px', fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}
        >
          Clear marking
        </button>
      </div>
    </>
  );
}

// ─── SidePanel ────────────────────────────────────────────────────────────────

function SidePanel({
  selectedTooth, state, highlightedVisit,
}: {
  selectedTooth: number | null;
  state?: ToothState;
  highlightedVisit: Visit | null;
}) {
  if (!selectedTooth) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden self-start sticky top-20">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 dark:text-white">Tooth details</span>
        </div>
        <div className="px-6 py-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pick a tooth</div>
          <div className="text-xs text-gray-500 leading-relaxed">Tap any tooth in the chart to see its conditions and details.</div>
        </div>
      </div>
    );
  }

  const surfaces = state?.surfaces || {};

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden self-start sticky top-20">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900 dark:text-white">Tooth details</span>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">#{selectedTooth}</span>
      </div>

      <div className="p-5">
        {/* Tooth preview */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-5">
          <div style={{ width: 48, height: 60, flexShrink: 0 }}>
            <ToothSVG toothNum={selectedTooth} state={state} large />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tooth #{selectedTooth}</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{TOOTH_NAMES[selectedTooth]}</div>
            {highlightedVisit && (
              <div className="text-xs text-gray-500 mt-1">Last visit · {highlightedVisit.date}</div>
            )}
          </div>
        </div>

        {/* Conditions */}
        <div className="mb-5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Current conditions</div>
          {!state?.whole && Object.keys(surfaces).length === 0 ? (
            <p className="text-xs text-gray-400 py-1">No conditions recorded. Tap a surface to mark.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {state?.whole && (
                <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: CONDITIONS[state.whole].color, display: 'inline-block', flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex-1">Whole tooth</span>
                  <span className="text-xs text-gray-500">{CONDITIONS[state.whole].label}</span>
                </div>
              )}
              {Object.entries(surfaces).map(([s, cond]) => (
                <div key={s} className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: CONDITIONS[cond as ConditionKey].color, display: 'inline-block', flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex-1">{SURFACE_LABEL[s]}</span>
                  <span className="text-xs text-gray-500">{CONDITIONS[cond as ConditionKey].label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</div>
          <textarea
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Add a note for this tooth..."
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main OdontogramTab ───────────────────────────────────────────────────────

interface OdontogramTabProps {
  patientId: string;
  visits: Visit[];
}

export default function OdontogramTab({ patientId, visits }: OdontogramTabProps) {
  const storageKey = `intellident_odon_${patientId}`;

  const [odonState, setOdonState] = useState<OdontogramMap>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [popover, setPopover] = useState<PopoverInfo | null>(null);
  const [notation, setNotation] = useState<'FDI' | 'Universal' | 'Palmer'>('FDI');
  const [highlightedVisitIdx, setHighlightedVisitIdx] = useState<number>(visits.length - 1);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(odonState)); } catch { /* noop */ }
  }, [odonState, storageKey]);

  const highlightedVisit = visits[highlightedVisitIdx] ?? null;

  // Teeth highlighted by the selected visit
  const visitTeeth = useMemo(() => {
    if (!highlightedVisit?.tooth_number) return new Set<number>();
    return new Set(
      highlightedVisit.tooth_number.split(',').map(t => parseInt(t.trim())).filter(Boolean)
    );
  }, [highlightedVisit]);

  const stats = useMemo(() => {
    let healthy = 32, attention = 0, treated = 0, missing = 0;
    Object.values(odonState).forEach((t) => {
      const surfList = Object.values(t.surfaces || {});
      if (t.whole === 'missing') { missing++; healthy--; }
      else if (surfList.includes('caries') || t.whole === 'fractured' || t.whole === 'extraction' || t.whole === 'sensitive' || t.whole === 'mobility') { attention++; healthy--; }
      else if (surfList.includes('filled') || t.whole === 'crown' || t.whole === 'rct' || t.whole === 'implant' || t.whole === 'bridge') { treated++; healthy--; }
    });
    return { healthy, attention, treated, missing };
  }, [odonState]);

  const handleSurfaceClick = (toothNum: number, surface: string) => {
    setSelectedTooth(toothNum);
    const el = document.querySelector(`[data-tooth="${toothNum}"]`);
    if (el && chartRef.current) {
      const elRect = el.getBoundingClientRect();
      const containerRect = chartRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      setPopover({
        tooth: toothNum,
        surface,
        position: {
          x: Math.max(0, Math.min(elRect.left - containerRect.left + elRect.width / 2 - 130, containerRect.width - 270)),
          y: elRect.bottom - containerRect.top + scrollY + 6,
        },
      });
    }
  };

  const handlePick = ({ scope, value }: { scope: 'surface' | 'whole' | 'clear'; value?: ConditionKey }) => {
    if (!popover) return;
    const { tooth, surface } = popover;
    setOdonState(prev => {
      const existing = prev[tooth] ?? {};
      if (scope === 'clear') {
        const next = { ...prev };
        delete next[tooth];
        return next;
      }
      if (scope === 'whole') {
        return { ...prev, [tooth]: { ...existing, whole: value! } };
      }
      if (scope === 'surface' && surface) {
        return {
          ...prev,
          [tooth]: {
            ...existing,
            surfaces: { ...(existing.surfaces || {}), [surface]: value! },
          },
        };
      }
      return prev;
    });
    setPopover(null);
  };

  const renderQuadrant = (key: string, teeth: number[], flip: boolean) => (
    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* tooth numbers */}
      <div style={{ display: 'flex', flexDirection: flip ? 'row-reverse' : 'row', gap: 4, justifyContent: 'center' }}>
        {teeth.map(t => (
          <div key={t} style={{ width: 36, textAlign: 'center', fontSize: 10, fontWeight: 700, color: visitTeeth.has(t) ? '#2563eb' : '#9ca3af', letterSpacing: '0.04em' }}>{toothLabel(t, notation)}</div>
        ))}
      </div>
      {/* teeth */}
      <div style={{ display: 'flex', flexDirection: flip ? 'row-reverse' : 'row', gap: 4, justifyContent: 'center' }}>
        {teeth.map(t => {
          const isSelected = selectedTooth === t;
          const isHighlighted = visitTeeth.has(t);
          return (
            <div
              key={t}
              data-tooth={t}
              onClick={() => setSelectedTooth(t)}
              style={{
                width: 36, height: 56, cursor: 'pointer', position: 'relative',
                transform: isSelected ? 'translateY(-3px)' : 'none',
                transition: 'transform 0.15s',
                filter: isHighlighted ? 'drop-shadow(0 0 4px #3b82f6)' : 'none',
                opacity: odonState[t]?.whole === 'missing' ? 0.25 : 1,
              }}
            >
              <ToothSVG
                toothNum={t}
                state={odonState[t]}
                selected={isSelected}
                onSurfaceClick={(s) => handleSurfaceClick(t, s)}
              />
              {odonState[t]?.whole === 'missing' && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#9ca3af', fontSize: 20, fontWeight: 700, pointerEvents: 'none' }}>✕</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const sortedVisits = [...visits].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="p-0">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { num: stats.healthy,   label: 'Healthy teeth',      cls: 'text-green-600 dark:text-green-400' },
          { num: stats.attention, label: 'Needs attention',     cls: 'text-red-600 dark:text-red-400' },
          { num: stats.treated,   label: 'Treated',             cls: 'text-blue-600 dark:text-blue-400' },
          { num: stats.missing,   label: 'Missing',             cls: 'text-amber-600 dark:text-amber-400' },
        ].map(({ num, label, cls }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3.5">
            <div className={`text-2xl font-black tracking-tight leading-none mb-1 ${cls}`}>{num}</div>
            <div className="text-[11px] font-semibold text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Main layout: chart + side panel */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Chart panel */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 relative" ref={chartRef}>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Dental chart · {notation} notation</div>
              <div className="text-xs text-gray-500 mt-0.5">Tap any surface to mark a condition</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
                {(['FDI', 'Universal', 'Palmer'] as const).map(n => (
                  <button key={n} onClick={() => setNotation(n)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${notation === n ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                  >{n}</button>
                ))}
              </div>
              <button onClick={() => { if (confirm('Clear all markings?')) setOdonState({}); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:text-gray-600 transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gradient-to-b from-gray-50/80 to-gray-50 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-100 dark:border-gray-700/50 rounded-xl p-5 my-3 relative">
            {/* Upper jaw */}
            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {renderQuadrant('Q1', FDI_TEETH.Q1, true)}
              {renderQuadrant('Q2', FDI_TEETH.Q2, false)}
            </div>
            {/* Midline divider */}
            <div className="my-5 border-t border-dashed border-gray-200 dark:border-gray-700" />
            {/* Lower jaw */}
            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {renderQuadrant('Q4', FDI_TEETH.Q4, true)}
              {renderQuadrant('Q3', FDI_TEETH.Q3, false)}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 p-3 bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 rounded-lg mt-3">
            {Object.entries(CONDITIONS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                <span style={{ width: 10, height: 10, borderRadius: 3, background: v.color, display: 'inline-block', flexShrink: 0 }} />
                {v.label}
              </div>
            ))}
          </div>

          {/* Visit timeline */}
          {sortedVisits.length > 0 && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Treatment timeline</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Click a visit to highlight treated teeth</div>
                </div>
                {highlightedVisit && (
                  <span className="text-xs font-semibold text-blue-600">
                    {highlightedVisit.date} · {highlightedVisit.visit_type}
                  </span>
                )}
              </div>

              {/* Track */}
              <div className="relative" style={{ height: 52, padding: '10px 0' }}>
                <div className="absolute inset-x-0" style={{ top: 22, height: 2, background: '#e5e7eb', borderRadius: 1 }} />
                {sortedVisits.length > 1 && (
                  <div className="absolute" style={{
                    top: 22, left: 0, height: 2,
                    width: `${(highlightedVisitIdx / (sortedVisits.length - 1)) * 100}%`,
                    background: '#2563eb', borderRadius: 1, transition: 'width 0.2s',
                  }} />
                )}
                {sortedVisits.map((v, i) => {
                  const left = sortedVisits.length === 1 ? 50 : (i / (sortedVisits.length - 1)) * 100;
                  const isCurrent = i === highlightedVisitIdx;
                  const isPast = i < highlightedVisitIdx;
                  return (
                    <div key={v.id} style={{ position: 'absolute', left: `${left}%`, transform: 'translateX(-50%)', top: 0 }}>
                      <button
                        onClick={() => setHighlightedVisitIdx(i)}
                        title={v.date}
                        style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: isCurrent ? '#2563eb' : '#fff',
                          border: `2px solid ${isCurrent || isPast ? '#2563eb' : '#d1d5db'}`,
                          cursor: 'pointer',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none',
                          transition: 'all 0.15s',
                          marginTop: 8,
                        }}
                      />
                      <div style={{
                        position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
                        fontSize: 10, fontWeight: 600, color: isCurrent ? '#2563eb' : '#9ca3af',
                        whiteSpace: 'nowrap',
                      }}>
                        {v.date.slice(5).replace('-', '/')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1">
                  <button disabled={highlightedVisitIdx === 0} onClick={() => setHighlightedVisitIdx(i => i - 1)}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 disabled:opacity-40 bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button disabled={highlightedVisitIdx === sortedVisits.length - 1} onClick={() => setHighlightedVisitIdx(i => i + 1)}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 disabled:opacity-40 bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button onClick={() => setHighlightedVisitIdx(sortedVisits.length - 1)}
                    className="px-2.5 h-7 text-[11px] font-semibold text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                    Latest
                  </button>
                </div>
                <span className="text-xs text-gray-400">Visit {highlightedVisitIdx + 1} of {sortedVisits.length}</span>
              </div>
            </div>
          )}

          {/* Popover */}
          {popover && (
            <SurfacePopover
              tooth={popover.tooth}
              surface={popover.surface}
              position={popover.position}
              onPick={handlePick}
              onClose={() => setPopover(null)}
            />
          )}
        </div>

        {/* Side panel */}
        <SidePanel
          selectedTooth={selectedTooth}
          state={selectedTooth ? odonState[selectedTooth] : undefined}
          highlightedVisit={highlightedVisit}
        />
      </div>
    </div>
  );
}
