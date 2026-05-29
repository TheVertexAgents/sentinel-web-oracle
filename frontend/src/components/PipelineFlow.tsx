import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { motion } from 'framer-motion';

const PipelineFlow: React.FC = () => {
  const { pipeline, isScanning } = useSelector((state: RootState) => state.app);

  const getBlockClass = (status: string) => {
    let cls = "relative group z-10 transition-all duration-500 ";
    if (status === 'active') cls += "border-cyan-500/50 shadow-cyber animate-pulse";
    if (status === 'verified' || status === 'completed') cls += "border-green-500/40";
    return cls;
  };

  return (
    <div className="flex-1 panel-bg cyber-border flex flex-col relative overflow-hidden bg-black/20">
      <div className="p-3 border-b border-cyan-500/20 flex justify-between items-center bg-cyan-500/5">
        <h2 className="text-xs font-bold tracking-widest text-cyan-500 uppercase flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-cyan-500 ${isScanning ? 'animate-pulse' : ''}`}></span>
          Agentic Loop Flow
        </h2>
        <span className="text-[10px] font-mono text-cyan-500/60">
          {isScanning ? 'Scanning Active' : 'System Ready'}
        </span>
      </div>

      <div className="flex-1 p-4 flex flex-col relative overflow-hidden">
        {/* STEP 01 */}
        <div className={getBlockClass(pipeline.disambiguation)}>
          <div className={`bg-panel border border-cyan-500/20 p-2 px-3 rounded flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-mono text-cyan-500/60 uppercase">Step 01</span>
              <div className="text-[10px] font-bold text-slate-300 font-mono">
                {pipeline.disambiguation === 'idle' ? 'AWAITING_VERIFICATION...' :
                 pipeline.disambiguation === 'active' ? 'RESOLVING_IDENTITY...' : 'IDENTITY_CONFIRMED'}
              </div>
            </div>
            <span className="status-icon text-[10px]">🔍</span>
          </div>
        </div>

        <div className="h-2 w-px bg-gradient-to-b from-cyan-500/50 to-cyan-500/10 mx-auto z-0"></div>

        {/* STEP 02 */}
        <div className={getBlockClass(pipeline.search)}>
          <div className="bg-panel border border-cyan-500/20 p-2 px-3 rounded flex items-center justify-between">
            <span className="text-[8px] font-mono text-cyan-500/60 uppercase">Step 02</span>
            <div className="flex gap-4">
              {['exploit', 'sec', 'flash'].map((node) => (
                <div key={node} className="flex items-center gap-1.5 transition-colors">
                  <span className={`text-[9px] font-bold uppercase ${
                    pipeline.nodes[node as keyof typeof pipeline.nodes] === 'completed' ? 'text-green-500' :
                    pipeline.nodes[node as keyof typeof pipeline.nodes] === 'active' ? 'text-cyan-400' : 'text-slate-500'
                  }`}>
                    {node === 'flash' ? 'FLASH LOANS' : node === 'sec' ? 'SEC ENFORCEMENT' : 'EXPLOIT NEWS'}
                  </span>
                  <span className={`text-[10px] ${pipeline.nodes[node as keyof typeof pipeline.nodes] === 'idle' ? 'opacity-30' : 'opacity-100'}`}>
                    {pipeline.nodes[node as keyof typeof pipeline.nodes] === 'completed' ? '✅' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-2 w-px bg-gradient-to-b from-cyan-500/50 to-cyan-500/10 mx-auto z-0"></div>

        {/* STEP 03 */}
        <div className={getBlockClass(pipeline.scrape)}>
          <div className="bg-panel border border-cyan-500/20 p-2 px-3 rounded flex items-center justify-between">
            <span className="text-[8px] font-mono text-cyan-500/60 uppercase">Step 03</span>
            <div className="flex gap-2">
              {[
                { id: 'coindesk', icon: '📰', label: 'COINDESK' },
                { id: 'twitter', icon: '𝕕', label: 'X_STREAM' },
                { id: 'reddit', icon: '🤖', label: 'REDDIT' }
              ].map((src) => (
                <div key={src.id} className={`flex items-center gap-1.5 px-2 py-0.5 bg-obsidian rounded border border-slate-800 transition-all ${
                  pipeline.unlockedSources.includes(src.id) ? 'opacity-100 grayscale-0' : 'opacity-30 grayscale'
                }`}>
                   <span className="text-[10px]">{src.icon}</span>
                   <span className="text-[8px] font-mono text-slate-400">{src.label}</span>
                   <span className={`text-[8px] ${pipeline.unlockedSources.includes(src.id) ? 'text-green-400' : ''}`}>
                     {pipeline.unlockedSources.includes(src.id) ? '🔓' : '🔒'}
                   </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-2 w-px bg-gradient-to-b from-cyan-500/50 to-cyan-500/10 mx-auto z-0"></div>

        {/* STEP 04 */}
        <div className={getBlockClass(pipeline.synthesis)}>
          <div className="bg-panel border border-cyan-500/20 p-2 px-3 rounded flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-[8px] font-mono text-cyan-500/60 uppercase">Step 04</span>
              <div className="flex items-center gap-2 flex-1">
                 <div className={`w-4 h-4 rounded-full border-2 border-slate-800 border-t-cyan-500 ${pipeline.synthesis === 'active' ? 'animate-spin' : ''}`}></div>
                 <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter w-24 truncate">
                   {pipeline.synthesis === 'idle' ? 'AWAITING_EVIDENCE...' :
                    pipeline.synthesis === 'active' ? 'SYNTHESIZING...' : 'DECISION_FINALIZED'}
                 </span>
                 <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                    <motion.div
                      className="h-full bg-cyan-500 w-0"
                      animate={{ width: pipeline.synthesis === 'completed' ? '100%' : (pipeline.synthesis === 'active' ? '60%' : '0%') }}
                      transition={{ duration: 1 }}
                    />
                 </div>
              </div>
            </div>
            <span className="text-[8px] font-mono text-slate-600">GROQ LLAMA-3.3-70B</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineFlow;
