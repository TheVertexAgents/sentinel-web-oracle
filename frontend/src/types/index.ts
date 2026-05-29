export interface ThreatVerdict {
  asset: string;
  threatLevel: 'CRITICAL' | 'ELEVATED' | 'NOMINAL';
  summary: string;
  evidence: { title: string; url: string; source: string; publishedAt?: string }[];
  timestamp: string;
  confidenceScore: number;
  sourcesChecked: string[];
  brightDataCallsUsed: number;
  riskAction: string;
  riskReason: string;
}

export interface AgentEvent {
  type: 'tool_call' | 'tool_result' | 'verdict' | 'error' | 'synthesis';
  tool?: string;
  input?: any;
  result?: string;
  verdict?: ThreatVerdict;
  message?: string;
}

export type PipelineStatus = 'idle' | 'active' | 'verified' | 'completed';

export interface PipelineState {
  disambiguation: PipelineStatus;
  search: PipelineStatus;
  scrape: PipelineStatus;
  synthesis: PipelineStatus;
  nodes: {
    exploit: PipelineStatus;
    sec: PipelineStatus;
    flash: PipelineStatus;
  };
  unlockedSources: string[];
}
