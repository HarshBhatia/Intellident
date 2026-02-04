'use client';

import { useState, useEffect } from 'react';

interface ToothSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

// Custom SVG Paths for realistic tooth shapes
const SHAPES = {
  Molar: "M4 4c0-1 2-2 4-2s4 1 4 2v4c0 2-1 3-2 5v7c0 1-1 2-2 2s-2-1-2-2v-7c-1-2-2-3-2-5V4z M12 4c0-1 2-2 4-2s4 1 4 2v4c0 2-1 3-2 5v7c0 1-1 2-2 2s-2-1-2-2v-7c-1-2-2-3-2-5V4z",
  Premolar: "M8 4c0-1 2-2 4-2s4 1 4 2v6c0 3-1 5-2 7v4c0 1-1 2-2 2s-2-1-2-2v-4c-1-2-2-4-2-7V4z",
  Canine: "M9 2c1-1 3-1 4 0l1 4c1 2 1 5 0 8l-1 6c0 1-1 2-2 2s-2-1-2-2l-1-6c-1-3-1-6 0-8l1-4z",
  Incisor: "M9 2h6v6c0 3-1 6-2 9v5c0 1-1 2-2 2s-2-1-2-2v-5c-1-3-2-6-2-9V2z"
};

// Simplified but anatomical SVG components
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

export default function ToothSelector({ value, onChange }: ToothSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (value) {
      const nums = value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      setSelected(new Set(nums));
    } else {
      setSelected(new Set());
    }
  }, [value]);

  const toggleTooth = (num: number) => {
    const newSet = new Set(selected);
    if (newSet.has(num)) {
      newSet.delete(num);
    } else {
      newSet.add(num);
    }
    setSelected(newSet);
    onChange(Array.from(newSet).sort((a, b) => a - b).join(', '));
  };

  const getToothIcon = (q: number) => {
    if (q >= 6) return <MolarIcon />;
    if (q >= 4) return <PremolarIcon />;
    if (q === 3) return <CanineIcon />;
    return <IncisorIcon />;
  };

  const Tooth = ({ num, q, flipped = false }: { num: number; q: number; flipped?: boolean }) => {
    const isSelected = selected.has(num);
    return (
      <div 
        onClick={() => toggleTooth(num)}
        className="flex flex-col items-center cursor-pointer group px-0.5"
      >
        <span className="text-[9px] font-bold text-gray-400 mb-1">{q}</span>
        <div className={`
          w-7 h-10 relative transition-all duration-200 
          ${isSelected ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'hover:scale-105 opacity-60 hover:opacity-100'}
          ${flipped ? 'rotate-180' : ''}
          ${isSelected ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}
        `}>
          {getToothIcon(q)}
        </div>
      </div>
    );
  };

  const upperLeft = [1,2,3,4,5,6,7,8].map(n => ({ u: n, q: 9-n }));
  const upperRight = [9,10,11,12,13,14,15,16].map(n => ({ u: n, q: n-8 }));
  const lowerLeft = [32,31,30,29,28,27,26,25].map(n => ({ u: n, q: n-24 }));
  const lowerRight = [17,18,19,20,21,22,23,24].map(n => ({ u: n, q: n-16 }));

  return (
    <div className="bg-[#111] p-8 rounded-2xl border border-gray-800 shadow-2xl select-none w-full overflow-x-auto transition-colors">
      <div className="min-w-[650px] flex flex-col items-center">
        
        {/* Upper Arch */}
        <div className="flex items-end gap-12 mb-8">
            <div className="flex gap-2 items-end border-r border-gray-800 pr-6">
                 {upperLeft.map(t => <Tooth key={t.u} num={t.u} q={t.q} />)}
            </div>
            <div className="flex gap-2 items-end">
                 {upperRight.map(t => <Tooth key={t.u} num={t.u} q={t.q} />)}
            </div>
        </div>

        {/* Midline */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-8"></div>

        {/* Lower Arch */}
        <div className="flex items-start gap-12">
             <div className="flex gap-2 items-start border-r border-gray-800 pr-6">
                {lowerLeft.map(t => <Tooth key={t.u} num={t.u} q={t.q} flipped />)}
            </div>
            <div className="flex gap-2 items-start">
                 {lowerRight.map(t => <Tooth key={t.u} num={t.u} q={t.q} flipped />)}
            </div>
        </div>

        <div className="mt-10 flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Treatment Area</span>
            </div>
        </div>
      </div>
    </div>
  );
}
