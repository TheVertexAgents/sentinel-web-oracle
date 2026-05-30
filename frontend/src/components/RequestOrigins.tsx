import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const RequestOrigins: React.FC = () => {
  const intensity = useSelector((state: RootState) => state.app.networkIntensity);
  const pathRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      phaseRef.current += 0.05;
      if (pathRef.current && fillRef.current) {
        let pts = [];
        for (let x = 0; x <= 200; x += 10) {
          let y = 35 + Math.sin(phaseRef.current + x * 0.05) * intensity;
          if (x % 20 === 0) y += Math.cos(phaseRef.current * 1.2 + x * 0.1) * (intensity * 0.4);
          pts.push(`${x},${y}`);
        }
        const d = `M${pts.join(' L')}`;
        pathRef.current.setAttribute('d', d);
        fillRef.current.setAttribute('d', d + ' L200,60 L0,60 Z');
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [intensity]);

  return (
    <div className="panel-bg cyber-border h-40 flex flex-col">
      <div className="p-2 border-b border-cyan-500/20 flex justify-between items-center px-3">
        <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Traffic Intensity</h2>
        <span className="text-[9px] font-mono text-green-500">LIVE_OPS</span>
      </div>
      <div className="flex-1 p-2 flex items-center justify-center relative bg-black/40">
        <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-10 pointer-events-none">
          <div className="w-full h-px bg-slate-500"></div>
          <div className="w-full h-px bg-slate-500"></div>
          <div className="w-full h-px bg-slate-500"></div>
          <div className="w-full h-px bg-slate-500"></div>
        </div>
        <svg className="w-full h-full text-cyan-500/60 relative z-10" viewBox="0 0 200 60" preserveAspectRatio="none">
          <path ref={pathRef} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path ref={fillRef} fill="url(#grad-req)" stroke="none" />
          <defs>
            <linearGradient id="grad-req" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: 'currentColor', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default RequestOrigins;
