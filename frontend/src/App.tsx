import React from 'react';
import Sidebar from './components/Sidebar';
import ScanControl from './components/ScanControl';
import PipelineFlow from './components/PipelineFlow';
import VerdictCard from './components/VerdictCard';
import HistoryLog from './components/HistoryLog';
import NetworkSecurity from './components/NetworkSecurity';
import RequestOrigins from './components/RequestOrigins';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from './store';
import { startScan } from './store/appSlice';
import { useScan } from './hooks/useScan';

const App: React.FC = () => {
  const dispatch = useDispatch();
  const { pipeline } = useSelector((state: RootState) => state.app);
  const { startAnalysis } = useScan();

  const handleStartScan = (asset: string) => {
    dispatch(startScan(asset));
    startAnalysis(asset, pipeline);
  };

  return (
    <div className="bg-obsidian text-slate-200 font-sans h-screen flex flex-col overflow-hidden w-full">
      {/* TOP TICKER */}
      <div className="w-full bg-panel border-b border-cyan-500/20 h-10 flex items-center overflow-hidden z-20">
        <div className="flex animate-[ticker_40s_linear_infinite] whitespace-nowrap">
          <div className="flex items-center px-8 py-2 font-mono text-xs gap-3 border-r border-cyan-500/10">
            <span className="text-cyan-500">📡</span> INITIALIZING SENTINEL MARKET FEED...
          </div>
          <div className="flex items-center px-8 py-2 font-mono text-xs gap-3 border-r border-cyan-500/10">
            <span className="text-cyan-500">📡</span> INITIALIZING SENTINEL MARKET FEED...
          </div>
        </div>
      </div>

      {/* MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-12 gap-4 flex-1 p-3 overflow-hidden">
        <Sidebar />

        {/* CENTER COLUMN */}
        <main className="col-span-7 flex flex-col gap-3 overflow-hidden">
          <ScanControl onStartScan={handleStartScan} />
          <PipelineFlow />
          <VerdictCard />
        </main>

        {/* RIGHT COLUMN */}
        <section className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <HistoryLog />
          <NetworkSecurity />
          <RequestOrigins />
        </section>
      </div>

      <footer className="h-8 bg-panel border-t border-cyan-500/10 flex items-center justify-between px-6 text-[9px] font-mono text-slate-600">
        <div>SENTINEL WEB ORACLE // v1.1.0-REACT</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-cyan-500 transition-colors">DOCUMENTATION</a>
          <a href="#" className="hover:text-cyan-500 transition-colors">SYSTEM_HEALTH</a>
          <a href="#" className="hover:text-cyan-500 transition-colors">API_STATUS: 100%</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
