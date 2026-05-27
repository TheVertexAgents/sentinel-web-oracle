import axios from 'axios';
import { ThreatVerdict } from '../agentLoop';

const BASE_URL = `http://localhost:${process.env.PORT || 3008}`;

/**
 * HTTP client for the Sentinel Web Oracle service.
 * Sends an asset name to the /analyze endpoint and returns the threat verdict.
 */
export async function analyzeAsset(asset: string): Promise<ThreatVerdict & { riskAction: string; riskReason: string }> {
  const response = await axios.post(`${BASE_URL}/analyze`, { asset });
  return response.data;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}
