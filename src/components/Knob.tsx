/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  id: string;
}

export function Knob({ label, value, min, max, onChange, id }: KnobProps) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const deltaY = startY.current - e.clientY;
    const range = max - min;
    const step = range / 200; // sensitivity
    let newValue = startValue.current + deltaY * step;
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const rotation = ((value - min) / (max - min)) * 270 - 135;

  return (
    <div className="flex flex-col items-center gap-2" id={`knob-container-${id}`}>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
      <div 
        className="relative w-12 h-12 rounded-full bg-[#1E1E21] border border-[#2A2A2E] cursor-ns-resize shadow-inner flex items-center justify-center group hover:border-blue-500/50 transition-colors"
        onMouseDown={handleMouseDown}
        id={id}
      >
        <motion.div 
          className="w-0.5 h-4 bg-blue-500 rounded-full origin-bottom absolute top-2"
          style={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <div className="w-8 h-8 rounded-full border border-black/20" />
      </div>
      <span className="text-[9px] font-mono text-slate-400">{value.toFixed(2)}</span>
    </div>
  );
}
