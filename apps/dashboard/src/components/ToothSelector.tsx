'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DentitionType } from '@/types';

interface ToothSelectorProps {
  value: string;
  dentitionType?: DentitionType;
  onDentitionTypeChange?: (type: DentitionType) => void;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

// Simplified anatomical SVG components
const MolarIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full">
    <path d="M6 4c-1 0-2 1-2 2v4c0 2 1 4 2 6v6c0 1 1 2 2 2s2-1 2-2v-6c1-2 2-4 2-6V6c0-1-1-2-2-2H6z M14 4c-1 0-2 1-2 2v4c0 2 1 4 2 6v6c0 1 1 2 2 2s2-1 2-2v-6c1-2 2-4 2-6V6c0-1-1-2-2-2H14z" fill="currentColor" />
  </svg>
);

const PremolarIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full">
    <path d="M8 4c-1 0-2 1-2 2v6c0 3 1 6 3 8v2c0 1 1 2 2 2s2-1 2-2v-2c2-2 3-5 3-8V6c0-1-1-2-2-2H8z" fill="currentColor" />
  </svg>
);

const CanineIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full">
    <path d="M12 2l-3 4v6c0 3 1 7 3 10 2-3 3-7 3-10V6l-3-4z" fill="currentColor" />
  </svg>
);

const IncisorIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full">
    <path d="M8 2h8v8c0 4-2 8-4 12-2-4-4-8-4-12V2z" fill="currentColor" />
  </svg>
);

export default function ToothSelector({ 
  value, 
  dentitionType: initialDentitionType = 'Adult',
  onDentitionTypeChange,
  onChange, 
  readOnly = false, 
  className 
}: ToothSelectorProps) {
  const [dentitionType, setDentitionType] = useState<DentitionType>(initialDentitionType);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDentitionType(initialDentitionType);
  }, [initialDentitionType]);

  useEffect(() => {
    if (value) {
      const items = value.split(',').map(s => s.trim()).filter(s => s !== '');
      setSelected(new Set(items));
    } else {
      setSelected(new Set());
    }
  }, [value]);

  const toggleTooth = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
    onChange?.(Array.from(newSet).join(', '));
  };

  const getToothIcon = (type: string, qIdx: number) => {
    if (type === 'Adult') {
        if (qIdx >= 6) return <MolarIcon />;
        if (qIdx >= 4) return <PremolarIcon />;
        if (qIdx === 3) return <CanineIcon />;
        return <IncisorIcon />;
    } else {
        if (qIdx >= 4) return <MolarIcon />;
        if (qIdx === 3) return <CanineIcon />;
        return <IncisorIcon />;
    }
  };

  const Tooth = ({ id, label, qIdx, flipped = false }: { id: string; label: string; qIdx: number; flipped?: boolean }) => {
    const isSelected = selected.has(id);
    return (
      <div 
        onClick={() => !readOnly && toggleTooth(id)}
        className={`flex flex-col items-center group px-0.5 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <span className="text-[9px] font-bold text-gray-400 mb-1">{label}</span>
        <div className={`
          w-7 h-10 relative transition-all duration-200 
          ${isSelected ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : (!readOnly ? 'hover:scale-105 opacity-60 hover:opacity-100' : 'opacity-40')}
          ${flipped ? 'rotate-180' : ''}
          ${isSelected ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}
        `}>
          {getToothIcon(dentitionType, qIdx)}
        </div>
      </div>
    );
  };

  const quadrants = useMemo(() => {
    if (dentitionType === 'Adult') {
        return {
            upperLeft: [8,7,6,5,4,3,2,1].map(n => ({ id: `UL-${n}`, label: n.toString(), qIdx: n })),
            upperRight: [1,2,3,4,5,6,7,8].map(n => ({ id: `UR-${n}`, label: n.toString(), qIdx: n })),
            lowerLeft: [8,7,6,5,4,3,2,1].map(n => ({ id: `LL-${n}`, label: n.toString(), qIdx: n })),
            lowerRight: [1,2,3,4,5,6,7,8].map(n => ({ id: `LR-${n}`, label: n.toString(), qIdx: n }))
        };
    } else {
        const labels = ['A', 'B', 'C', 'D', 'E'];
        return {
            upperLeft: [5,4,3,2,1].map(n => ({ id: `CUL-${labels[n-1]}`, label: labels[n-1], qIdx: n })),
            upperRight: [1,2,3,4,5].map(n => ({ id: `CUR-${labels[n-1]}`, label: labels[n-1], qIdx: n })),
            lowerLeft: [5,4,3,2,1].map(n => ({ id: `CLL-${labels[n-1]}`, label: labels[n-1], qIdx: n })),
            lowerRight: [1,2,3,4,5].map(n => ({ id: `CLR-${labels[n-1]}`, label: labels[n-1], qIdx: n }))
        };
    }
  }, [dentitionType]);

  const handleModeToggle = (type: DentitionType) => {
      if (readOnly) return;
      setDentitionType(type);
      onDentitionTypeChange?.(type);
  };

  return (
    <div className={className || "bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-2xl select-none w-full overflow-x-auto transition-colors"}>
      <div className={`${readOnly ? '' : 'min-w-[500px]'} flex flex-col items-center`}>
        
        {!readOnly && (
            <div className="flex gap-2 mb-8 p-1 bg-gray-900 rounded-xl border border-gray-800">
                {(['Adult', 'Child'] as const).map(mode => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => handleModeToggle(mode)}
                        className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dentitionType === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        )}

        {/* Upper Arch */}
        <div className={`flex items-end ${readOnly ? 'gap-4' : 'gap-10'} mb-6`}>
            <div className={`flex items-end border-r border-gray-800 ${readOnly ? 'pr-2' : 'pr-5'}`}>
                 {quadrants.upperLeft.map(t => <Tooth key={t.id} id={t.id} label={t.label} qIdx={t.qIdx} />)}
            </div>
            <div className="flex items-end">
                 {quadrants.upperRight.map(t => <Tooth key={t.id} id={t.id} label={t.label} qIdx={t.qIdx} />)}
            </div>
        </div>

        {/* Midline */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-6"></div>

        {/* Lower Arch */}
        <div className={`flex items-start ${readOnly ? 'gap-4' : 'gap-10'}`}>
             <div className={`flex items-start border-r border-gray-800 ${readOnly ? 'pr-2' : 'pr-5'}`}>
                {quadrants.lowerLeft.map(t => <Tooth key={t.id} id={t.id} label={t.label} qIdx={t.qIdx} flipped />)}
            </div>
            <div className="flex items-start">
                 {quadrants.lowerRight.map(t => <Tooth key={t.id} id={t.id} label={t.label} qIdx={t.qIdx} flipped />)}
            </div>
        </div>

        {!readOnly && (
            <div className="mt-8 flex items-center justify-between w-full px-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Selection Active</span>
                </div>
                <button 
                    type="button"
                    onClick={() => { setSelected(new Set()); onChange?.(''); }}
                    className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition"
                >
                    Clear All
                </button>
            </div>
        )}
      </div>
    </div>
  );
}