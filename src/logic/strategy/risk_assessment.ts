import { ThreatVerdict } from '../agentLoop';

export type RiskAction = 'HOLD' | 'MONITOR' | 'CLEAR';

export interface RiskDecision {
  action: RiskAction;
  reason: string;
}

/**
 * Maps a ThreatVerdict threat level to a concrete risk action.
 *
 * CRITICAL  → HOLD    (halt trading / exposure immediately)
 * ELEVATED  → MONITOR (watch closely, reduce position size)
 * NOMINAL   → CLEAR   (no action required)
 */
export function assessRisk(verdict: ThreatVerdict): RiskDecision {
  switch (verdict.threatLevel) {
    case 'CRITICAL':
      return {
        action: 'HOLD',
        reason: `Critical threat detected for ${verdict.asset}. Immediate halt recommended. ${verdict.summary}`,
      };
    case 'ELEVATED':
      return {
        action: 'MONITOR',
        reason: `Elevated risk for ${verdict.asset}. Increased monitoring advised. ${verdict.summary}`,
      };
    case 'NOMINAL':
    default:
      return {
        action: 'CLEAR',
        reason: `No significant threats detected for ${verdict.asset}.`,
      };
  }
}
