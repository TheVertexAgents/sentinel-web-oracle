import React, { useEffect, useState } from 'react';

const RequestOrigins: React.FC = () => {
  const [activeNodes, setActiveNodes] = useState<string[]>([]);

  useEffect(() => {
    // Listen for custom pulse events
    const handlePulse = (e: any) => {
      const nodeId = e.detail;
      setActiveNodes(prev => [...prev, nodeId]);
      setTimeout(() => {
        setActiveNodes(prev => prev.filter(id => id !== nodeId));
      }, 2000);
    };

    window.addEventListener('pulse-map', handlePulse);
    return () => window.removeEventListener('pulse-map', handlePulse);
  }, []);

  const getNodeColor = (id: string) => {
    if (activeNodes.includes(id)) {
      return id === 'node-eu' ? '#ef4444' : '#00f2fe';
    }
    return '#484f58';
  };

  const getNodeRadius = (id: string) => {
    return activeNodes.includes(id) ? 4 : 2;
  };

  return (
    <div className="panel-bg cyber-border h-48 flex flex-col">
      <div className="p-2 border-b border-cyan-500/20 px-3">
        <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Request Origins</h2>
      </div>
      <div className="flex-1 p-2 relative bg-obsidian">
        <svg className="w-full h-full opacity-70" viewBox="0 0 200 100">
          <path d="M30,30 L40,25 L50,30 L60,25 L70,30 L80,35 L90,30 L100,25 L110,30 L120,35 L130,30 L140,25 L150,30 L160,25 L170,30 M20,50 L180,50 M30,70 L170,70" stroke="#484f58" strokeWidth="0.8" fill="none"></path>
          <circle cx="45" cy="35" r={getNodeRadius('node-eu')} fill={getNodeColor('node-eu')} className="transition-all duration-500"></circle>
          <circle cx="155" cy="45" r={getNodeRadius('node-us')} fill={getNodeColor('node-us')} className="transition-all duration-500"></circle>
          <circle cx="100" cy="65" r={getNodeRadius('node-asia')} fill={getNodeColor('node-asia')} className="transition-all duration-500"></circle>
          <circle cx="80" cy="25" r={getNodeRadius('node-generic')} fill={getNodeColor('node-generic')} className="transition-all duration-500"></circle>
        </svg>
        <div className="absolute bottom-2 left-2 flex flex-col gap-1">
           <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
              <span className="text-[7px] font-mono text-slate-500">US_EAST_01</span>
           </div>
           <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-threat"></div>
              <span className="text-[7px] font-mono text-slate-500">EU_WEST_04</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RequestOrigins;
