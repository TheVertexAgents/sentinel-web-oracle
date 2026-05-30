import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { setCurrentAsset } from '../store/appSlice';

interface ScanControlProps {
  onStartScan: (asset: string) => void;
}

const ScanControl: React.FC<ScanControlProps> = ({ onStartScan }) => {
  const dispatch = useDispatch();
  const currentAsset = useSelector((state: RootState) => state.app.currentAsset);
  const [input, setInput] = useState(currentAsset);
  const isScanning = useSelector((state: RootState) => state.app.isScanning);

  useEffect(() => {
    setInput(currentAsset);
  }, [currentAsset]);

  const handleScan = () => {
    const asset = input.trim().toUpperCase();
    if (asset) {
      onStartScan(asset);
    }
  };

  return (
    <div className="panel-bg cyber-border p-3 bg-gradient-to-r from-panel to-slate-900/50">
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              dispatch(setCurrentAsset(e.target.value.toUpperCase()));
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="ENTER TICKER (E.G. ETH)..."
            className="w-full bg-obsidian border border-cyan-500/30 rounded p-3 pl-4 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all uppercase tracking-widest text-lg"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-cyan-500/50 font-mono hidden md:block">
            INPUT_ASSET
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-black px-8 py-3 rounded transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)] hover:shadow-[0_0_25px_rgba(0,242,254,0.6)] active:scale-95 uppercase tracking-tighter text-sm"
        >
          {isScanning ? 'Scanning...' : 'Deep Scan'}
        </button>
      </div>
    </div>
  );
};

export default ScanControl;
