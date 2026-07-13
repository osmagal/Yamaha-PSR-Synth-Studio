/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { synthEngine } from '../lib/synth';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  id: string;
}

export function Knob({ label, value, min, max, onChange, id }: KnobProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const valueRef = useRef(value);

  // Sync ref with prop
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const updateValue = (delta: number) => {
    const range = max - min;
    // Sensibilidade dinâmica: valores maiores (frequência) mudam mais rápido
    const step = range / 100;
    const newValue = Math.max(min, Math.min(max, valueRef.current + delta * step));
    
    valueRef.current = newValue;
    synthEngine.updateParameter(id, newValue);
    onChange(newValue);
  };

  const startRepeating = (delta: number) => {
    stopRepeating(); // Safety clear
    updateValue(delta);
    
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        updateValue(delta);
      }, 40); // 25 updates per second for smooth movement
    }, 300);

    // Global listener to ensure it stops even if mouse leaves the button
    window.addEventListener('mouseup', stopRepeating);
  };

  const stopRepeating = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    window.removeEventListener('mouseup', stopRepeating);
  };

  useEffect(() => {
    return () => stopRepeating();
  }, []);

  return (
    <div className="flex flex-col items-center gap-2" id={`control-container-${id}`}>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
      
      <div className="flex items-center gap-0.5 bg-[#1E1E21] rounded-lg p-0.5 border border-[#2A2A2E]">
        <button
          onMouseDown={() => startRepeating(-1)}
          onMouseUp={stopRepeating}
          onMouseLeave={stopRepeating}
          onTouchStart={(e) => { e.preventDefault(); startRepeating(-1); }}
          onTouchEnd={stopRepeating}
          className="p-1 hover:bg-white/5 active:bg-white/10 rounded transition-colors text-slate-400 hover:text-white touch-none"
          id={`${id}-minus`}
        >
          <Minus size={10} />
        </button>

        <div className="w-9 text-center bg-black/20 py-0.5 rounded border border-[#2A2A2E]">
          <span className="text-[9px] font-mono text-blue-400 font-bold">
            {max > 100 ? value.toFixed(0) : value.toFixed(2)}
          </span>
        </div>

        <button
          onMouseDown={() => startRepeating(1)}
          onMouseUp={stopRepeating}
          onMouseLeave={stopRepeating}
          onTouchStart={(e) => { e.preventDefault(); startRepeating(1); }}
          onTouchEnd={stopRepeating}
          className="p-1 hover:bg-white/5 active:bg-white/10 rounded transition-colors text-slate-400 hover:text-white touch-none"
          id={`${id}-plus`}
        >
          <Plus size={10} />
        </button>
      </div>
      
      <div className="w-full max-w-[56px] h-1 bg-[#1E1E21] rounded-full overflow-hidden mt-1">
        <div 
          className="h-full bg-blue-500/50" 
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}
