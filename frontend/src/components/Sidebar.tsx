import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { toggleDemoMode, setCurrentAsset } from '../store/appSlice';

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const { currentAsset, isDemoMode } = useSelector((state: RootState) => state.app);

  const assets = [
    { ticker: 'BTC', name: 'BITCOIN' },
    { ticker: 'ETH', name: 'ETHEREUM' },
    { ticker: 'SOL', name: 'SOLANA' },
    { ticker: 'USDC', name: 'USD COIN' },
    { ticker: 'UNI', name: 'UNISWAP' },
    { ticker: 'AAVE', name: 'AAVE' },
  ];

  return (
    <aside className="col-span-2 flex flex-col gap-4 overflow-hidden">
      <div className="panel-bg cyber-border h-full flex flex-col">
        <div className="p-3 border-b border-cyan-500/20 bg-cyan-500/5">
          <h2 className="text-xs font-bold tracking-widest text-cyan-500 uppercase">Tracking Status</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {assets.map((asset) => (
            <button
              key={asset.ticker}
              onClick={() => dispatch(setCurrentAsset(asset.ticker))}
              className={`w-full text-left p-3 rounded border transition-all group relative overflow-hidden ${
                currentAsset === asset.ticker
                  ? 'border-cyan-500/50 bg-cyan-500/10 active'
                  : 'border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5'
              }`}
            >
              <div className="flex justify-between items-center relative z-10">
                <span className="font-bold text-sm group-hover:text-cyan-400 transition-colors">
                  {asset.name} ({asset.ticker})
                </span>
                <span className="text-[10px] text-slate-500 group-hover:text-cyan-600 font-mono">LIVE</span>
              </div>
              <div className={`absolute inset-y-0 left-0 w-1 bg-cyan-500 transition-transform ${
                currentAsset === asset.ticker ? 'translate-x-0' : '-translate-x-full'
              }`} />
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-cyan-500/20 mt-auto bg-black/40">
           <div className="flex items-center gap-2 mb-2">
             <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] ${isDemoMode ? 'bg-cyan-400' : 'bg-green-500'}`}></div>
             <span className={`text-[10px] font-mono ${isDemoMode ? 'text-cyan-400' : 'text-slate-400'}`}>
               {isDemoMode ? 'SIMULATED ENVIRONMENT' : 'NETWORK ACTIVE'}
             </span>
           </div>
           <button
             onClick={() => dispatch(toggleDemoMode())}
             className={`w-full py-1 text-[9px] font-bold border rounded transition-colors tracking-tighter ${
               isDemoMode
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : 'border-slate-700 hover:bg-slate-800'
             }`}
           >
             DEMO MODE: {isDemoMode ? 'ON' : 'OFF'}
           </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
