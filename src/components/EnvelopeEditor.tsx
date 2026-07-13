/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface EnvelopeEditorProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  onChange: (key: string, value: number) => void;
  color?: string;
}

export function EnvelopeEditor({ attack, decay, sustain, release, onChange, color = '#3B82F6' }: EnvelopeEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef<string | null>(null);

  const width = 300;
  const height = 120;
  const padding = 20;

  // Normalize values for visualization (0-4 seconds usually)
  const maxTime = 4;
  
  const getX = (time: number, prevX: number) => prevX + (time / maxTime) * (width - padding * 2) * 0.25;
  const getY = (level: number) => height - padding - (level * (height - padding * 2));

  const points = {
    start: { x: padding, y: height - padding },
    attack: { x: padding + (attack / maxTime) * (width - padding * 2) * 0.4, y: padding },
    decay: { x: padding + (attack / maxTime) * (width - padding * 2) * 0.4 + (decay / maxTime) * (width - padding * 2) * 0.4, y: getY(sustain) },
    sustainEnd: { x: width - padding - (release / maxTime) * (width - padding * 2) * 0.4, y: getY(sustain) },
    release: { x: width - padding, y: height - padding }
  };

  const path = `M ${points.start.x} ${points.start.y} 
                L ${points.attack.x} ${points.attack.y} 
                L ${points.decay.x} ${points.decay.y} 
                L ${points.sustainEnd.x} ${points.sustainEnd.y} 
                L ${points.release.x} ${points.release.y}`;

  const handleMouseDown = (node: string) => {
    isDragging.current = node;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (node: string) => {
    isDragging.current = node;
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateFromPosition(x, y);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || !svgRef.current) return;
    e.preventDefault();
    
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    updateFromPosition(x, y);
  };

  const updateFromPosition = (x: number, y: number) => {
    const node = isDragging.current;
    
    if (node === 'attack') {
      const newVal = Math.max(0.01, Math.min(maxTime, ((x - padding) / (width - padding * 2)) * maxTime * 2.5));
      onChange('attack', newVal);
    } else if (node === 'decay') {
      const newVal = Math.max(0.01, Math.min(maxTime, ((x - points.attack.x) / (width - padding * 2)) * maxTime * 2.5));
      onChange('decay', newVal);
    } else if (node === 'sustain') {
      const newVal = Math.max(0, Math.min(1, (height - padding - y) / (height - padding * 2)));
      onChange('sustain', newVal);
    } else if (node === 'release') {
      const newVal = Math.max(0.01, Math.min(maxTime, ((width - padding - x) / (width - padding * 2)) * maxTime * 2.5));
      onChange('release', newVal);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchEnd = () => {
    isDragging.current = null;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="relative bg-[#1E1E21] rounded-xl border border-[#2A2A2E] overflow-hidden p-2 touch-none">
      <svg 
        ref={svgRef}
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="cursor-crosshair"
      >
        {/* Grid Lines */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#2A2A2E" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#2A2A2E" strokeWidth="1" />
        
        {/* Shadow Path */}
        <path 
          d={`${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`} 
          fill={color} 
          fillOpacity="0.05" 
        />

        {/* Main Path */}
        <motion.path 
          d={path} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />

        {/* Interactive Nodes */}
        <circle 
          cx={points.attack.x} cy={points.attack.y} r="4" 
          fill={color} className="cursor-ew-resize hover:r-6 transition-all"
          onMouseDown={() => handleMouseDown('attack')}
          onTouchStart={() => handleTouchStart('attack')}
        />
        <circle 
          cx={points.decay.x} cy={points.decay.y} r="4" 
          fill={color} className="cursor-move hover:r-6 transition-all"
          onMouseDown={() => handleMouseDown('sustain')}
          onTouchStart={() => handleTouchStart('sustain')}
        />
        <circle 
          cx={points.sustainEnd.x} cy={points.sustainEnd.y} r="4" 
          fill={color} className="cursor-ew-resize hover:r-6 transition-all"
          onMouseDown={() => handleMouseDown('release')}
          onTouchStart={() => handleTouchStart('release')}
        />
      </svg>
      
      <div className="flex justify-between px-2 mt-1">
        <span className="text-[8px] font-mono text-slate-500 uppercase">Attack: {attack.toFixed(2)}s</span>
        <span className="text-[8px] font-mono text-slate-500 uppercase">Sustain: {(sustain * 100).toFixed(0)}%</span>
        <span className="text-[8px] font-mono text-slate-500 uppercase">Release: {release.toFixed(2)}s</span>
      </div>
    </div>
  );
}
