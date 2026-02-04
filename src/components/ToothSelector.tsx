'use client';

import { useState, useEffect } from 'react';

interface ToothSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TOOTH_PATH = "M12 2C8 2 5 5 5 9c0 2.5 1.5 4.5 3 6v5c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-5c1.5-1.5 3-3.5 3-6 0-4-3-7-7-7z";

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

  const Tooth = ({ num, displayLabel }: { num: number; displayLabel: number }) => {
    const isSelected = selected.has(num);
    return (
      <div 
        onClick={() => toggleTooth(num)}
        className="flex flex-col items-center cursor-pointer group px-0.5"
      >
        <div className={`
          w-9 h-12 relative transition-all duration-200 
          ${isSelected ? 'scale-110 drop-shadow-md' : 'hover:scale-105'}
        `}>
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-sm">
             <path 
               d={TOOTH_PATH} 
               fill={isSelected ? '#3B82F6' : 'var(--card)'} 
               stroke={isSelected ? '#2563EB' : 'var(--muted-foreground)'}
               strokeWidth="1.5"
             />
             {!isSelected && (
                <path d="M10 5 Q12 8 14 5" fill="none" stroke="var(--border)" strokeWidth="1" />
             )}
          </svg>
          {isSelected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center mt-1 leading-none">
            <span className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {displayLabel}
            </span>
        </div>
      </div>
    );
  };

  // Internal Universal Mapping (1-32) displayed as Quadrant (1-8)
  // Logic: 
  // Viewer Top Left (Patient UR): Univ 1..8 -> Display 8,7,6,5,4,3,2,1
  const upperLeft = [1,2,3,4,5,6,7,8].map(n => ({ u: n, q: 9-n }));
  // Viewer Top Right (Patient UL): Univ 9..16 -> Display 1,2,3,4,5,6,7,8
  const upperRight = [9,10,11,12,13,14,15,16].map(n => ({ u: n, q: n-8 }));
  // Viewer Bottom Left (Patient LR): Univ 32..25 -> Display 8,7,6,5,4,3,2,1
  const lowerLeft = [32,31,30,29,28,27,26,25].map(n => ({ u: n, q: n-24 }));
  // Viewer Bottom Right (Patient LL): Univ 17..24 -> Display 1,2,3,4,5,6,7,8
  const lowerRight = [17,18,19,20,21,22,23,24].map(n => ({ u: n, q: n-16 }));

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm select-none w-full overflow-x-auto transition-colors">
      <div className="min-w-[600px]">
        <h3 className="text-center text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-6">Odontogram (1-8 Quadrant)</h3>
        
        {/* Upper Arch */}
        <div className="flex justify-center mb-4">
            <div className="flex gap-1 border-b-2 border-r-2 border-gray-200 dark:border-gray-800 px-4 pb-2">
                 {upperLeft.map(t => <Tooth key={t.u} num={t.u} displayLabel={t.q} />)}
            </div>
            <div className="flex gap-1 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 px-4 pb-2">
                 {upperRight.map(t => <Tooth key={t.u} num={t.u} displayLabel={t.q} />)}
            </div>
        </div>

        {/* Lower Arch */}
        <div className="flex justify-center">
             <div className="flex gap-1 border-t-2 border-r-2 border-gray-200 dark:border-gray-800 px-4 pt-2">
                {lowerLeft.map(t => <Tooth key={t.u} num={t.u} displayLabel={t.q} />)}
            </div>
            <div className="flex gap-1 border-t-2 border-l-2 border-gray-200 dark:border-gray-800 px-4 pt-2">
                 {lowerRight.map(t => <Tooth key={t.u} num={t.u} displayLabel={t.q} />)}
            </div>
        </div>

        <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-600 italic">Showing center-out quadrant numbering</p>
        </div>
      </div>
    </div>
  );
}