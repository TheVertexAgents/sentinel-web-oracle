import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const HistoryLog: React.FC = () => {
  const history = useSelector((state: RootState) => state.app.history);

  return (
    <div className="panel-bg cyber-border flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b border-cyan-500/20 bg-cyan-500/5">
        <h2 className="text-xs font-bold tracking-widest text-cyan-500 uppercase">Threat History</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.map((entry, i) => {
          let dotColor = 'bg-cyan-500/50';
          let statusPill = '';
          const isCritical = entry.threatLevel === 'CRITICAL';
          const isScanComplete = entry.action.includes('SCAN_COMPLETE');

          if (isCritical) {
            dotColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
            statusPill = '<span class="px-1.5 py-0.5 rounded-sm bg-red-900/30 text-red-500 text-[8px] font-bold">CRITICAL</span>';
          } else if (isScanComplete) {
            dotColor = 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]';
            statusPill = '<span class="px-1.5 py-0.5 rounded-sm bg-green-900/30 text-green-500 text-[8px] font-bold">ACTIVE</span>';
          } else if (entry.action.includes('ERROR')) {
            dotColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
          }

          const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + 'Z';

          return (
            <div key={i} className="flex items-center gap-2 py-2 px-3 rounded bg-black/20 border border-white/5 text-xs font-mono">
              <span className="text-slate-500 w-10">{time}</span>
              <span className="font-bold text-cyan-500/80 w-8">{entry.asset}</span>
              <span className="flex-1 text-slate-400 truncate uppercase">{entry.action}</span>
              {statusPill && <div dangerouslySetInnerHTML={{ __html: statusPill }} />}
              <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryLog;
