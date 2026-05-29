import React, { useEffect, useRef } from 'react';
import { Chart, ArcElement, DoughnutController } from 'chart.js';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

Chart.register(ArcElement, DoughnutController);

const VerdictCard: React.FC = () => {
  const verdict = useSelector((state: RootState) => state.app.verdict);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (verdict && canvasRef.current) {
      const score = verdict.confidenceScore;
      const level = verdict.threatLevel;
      const color = level === 'CRITICAL' ? '#ef4444' : (level === 'ELEVATED' ? '#f59e0b' : '#22c55e');

      if (chartRef.current) chartRef.current.destroy();

      chartRef.current = new Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [score, 100 - score],
            backgroundColor: [color, 'rgba(255,255,255,0.02)'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
          }]
        },
        options: {
          aspectRatio: 1,
          cutout: '85%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
      });
    }
  }, [verdict]);

  if (!verdict) return null;

  const isCritical = verdict.threatLevel === 'CRITICAL';

  return (
    <div className={`panel-bg border-2 p-3 transition-all duration-500 ${
      isCritical ? 'border-threat bg-threat/5 shadow-cyber-red' : 'border-cyan-500/30'
    }`}>
      <div className="flex flex-row items-center space-x-6">
         <div className="w-20 h-20 flex-shrink-0 relative">
            <canvas ref={canvasRef}></canvas>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
              <span className={`text-xl font-black font-mono ${isCritical ? 'neon-text-red' : ''}`} style={{ color: isCritical ? '#ef4444' : (verdict.threatLevel === 'ELEVATED' ? '#f59e0b' : '#22c55e') }}>
                {verdict.confidenceScore}
              </span>
              <span className="text-[6px] font-mono text-slate-500 -mt-1 uppercase">Threat</span>
            </div>
         </div>
         <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className={`text-lg font-black font-mono tracking-tighter ${isCritical ? 'text-threat neon-text-red' : 'text-white'}`}>
                {verdict.asset}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                  isCritical ? 'bg-threat text-white' : 'bg-cyan-500 text-obsidian'
                }`}>
                  {verdict.threatLevel}
                </span>
                <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black tracking-widest uppercase ${
                  isCritical ? 'border-threat text-threat' : 'border-cyan-500 text-cyan-500'
                }`}>
                  {verdict.riskAction}
                </span>
              </div>
            </div>
            <div className="text-white text-sm font-semibold leading-snug">
              "{verdict.riskReason}"
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
              {verdict.evidence.map((e, i) => (
                <a key={i} href={e.url} target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-mono text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 whitespace-nowrap">
                  {e.title.substring(0, 20)}{e.title.length > 20 ? '...' : ''}
                </a>
              ))}
            </div>
         </div>
         <div className="text-right flex flex-col justify-center border-l border-white/10 pl-4 h-12">
            <span className="text-[7px] font-mono text-slate-500 uppercase block">TIMESTAMP_Z</span>
            <span className="text-[9px] font-mono text-slate-300">
              {new Date(verdict.timestamp).toISOString().replace('T', ' ').substring(0, 19)}Z
            </span>
         </div>
      </div>
    </div>
  );
};

export default VerdictCard;
