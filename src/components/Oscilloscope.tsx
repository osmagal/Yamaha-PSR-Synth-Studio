/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

interface OscilloscopeProps {
  analyser: Tone.Analyser | null;
}

export function Oscilloscope({ analyser }: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const values = analyser.getValue() as Float32Array;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#34d399'; // emerald-400
      
      const sliceWidth = canvas.width / values.length;
      let x = 0;

      for (let i = 0; i < values.length; i++) {
        const v = values[i] * 1.5; // Gain factor for visual
        const y = (v * canvas.height) / 2 + canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div className="w-full h-32 bg-zinc-950 rounded border border-zinc-800 overflow-hidden relative" id="oscilloscope-container">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={128} 
        className="w-full h-full opacity-80"
        id="oscilloscope-canvas"
      />
      <div className="absolute inset-0 pointer-events-none grid grid-cols-8 grid-rows-4 opacity-10">
        {[...Array(32)].map((_, i) => (
          <div key={i} className="border border-zinc-500" />
        ))}
      </div>
    </div>
  );
}
