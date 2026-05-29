import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { runAgentLoop, ThreatVerdict, AgentEvent } from './agentLoop';
import { assessRisk } from './strategy/risk_assessment';
import { saveVerdict, saveMonitor, deleteMonitor, getAllMonitors, MonitorRecord } from './db';

export type FeedListener = (event: AgentEvent) => void;
const feedListeners: Set<FeedListener> = new Set();

export function addFeedListener(listener: FeedListener) {
  feedListeners.add(listener);
}

export function removeFeedListener(listener: FeedListener) {
  feedListeners.delete(listener);
}

function broadcastToFeed(event: AgentEvent) {
  feedListeners.forEach(listener => listener(event));
}

const activeMonitors: Map<string, NodeJS.Timeout> = new Map();
const analysisCache: Map<string, { verdict: any; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function startMonitoring(
  assets: string[],
  intervalSeconds: number,
  webhookUrl?: string
): Promise<string> {
  const id = uuidv4();
  const startedAt = new Date().toISOString();

  await saveMonitor({
    id,
    assets: JSON.stringify(assets),
    intervalSeconds,
    webhookUrl,
    startedAt
  });

  const runTask = async () => {
    console.log(`[Monitor] Running scheduled scan for: ${assets.join(', ')} (ID: ${id})`);

    for (const asset of assets) {
      try {
        const verdict = await runAgentLoop(asset);
        const decision = assessRisk(verdict);
        const fullVerdict = { ...verdict, riskAction: decision.action, riskReason: decision.reason };

        // Save to history
        await saveVerdict({
          ...fullVerdict,
          sourcesChecked: JSON.stringify(fullVerdict.sourcesChecked)
        });

        // Broadcast to live feed
        broadcastToFeed({
          type: 'verdict',
          verdict: fullVerdict
        });

        // Fire webhook if CRITICAL or ELEVATED
        if (webhookUrl && (verdict.threatLevel === 'CRITICAL' || verdict.threatLevel === 'ELEVATED')) {
          console.log(`[Monitor] Firing webhook for ${asset}: ${webhookUrl}`);
          axios.post(webhookUrl, fullVerdict).catch(err => {
            console.error(`[Monitor] Webhook failed for ${asset}:`, err.message);
          });
        }
      } catch (err: any) {
        console.error(`[Monitor] Task failed for ${asset}:`, err.message);
      }
    }
  };

  // Schedule task
  const timer = setInterval(runTask, intervalSeconds * 1000);
  activeMonitors.set(id, timer);

  // Run once immediately
  runTask();

  return id;
}

export async function stopMonitoring(id: string) {
  const timer = activeMonitors.get(id);
  if (timer) {
    clearInterval(timer);
    activeMonitors.delete(id);
  }
  await deleteMonitor(id);
}

export async function initMonitoring() {
  const monitors = await getAllMonitors();
  console.log(`[Monitor] Restoring ${monitors.length} active monitors`);

  for (const m of monitors) {
    const assets = JSON.parse(m.assets);
    const timer = setInterval(async () => {
      for (const asset of assets) {
        try {
          const verdict = await runAgentLoop(asset);
          const decision = assessRisk(verdict);
          const fullVerdict = { ...verdict, riskAction: decision.action, riskReason: decision.reason };

          await saveVerdict({
            ...fullVerdict,
            sourcesChecked: JSON.stringify(fullVerdict.sourcesChecked)
          });

          broadcastToFeed({
            type: 'verdict',
            verdict: fullVerdict
          });

          if (m.webhookUrl && (verdict.threatLevel === 'CRITICAL' || verdict.threatLevel === 'ELEVATED')) {
            axios.post(m.webhookUrl, fullVerdict).catch(() => {});
          }
        } catch (err) {}
      }
    }, m.intervalSeconds * 1000);

    activeMonitors.set(m.id, timer);
  }
}

/** Wrapper for analyze_crypto_threat to ensure feed broadcasting and history saving */
export async function runAnalyisAndTrack(
  asset: string,
  emit?: (event: AgentEvent) => void,
  useCache = true
): Promise<ThreatVerdict & { riskAction: string; riskReason: string }> {

  if (useCache) {
    const cached = analysisCache.get(asset);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Cache] Returning cached verdict for ${asset}`);
      const verdict = cached.verdict;
      if (emit) emit({ type: 'verdict', verdict });
      return verdict;
    }
  }

  const verdict = await runAgentLoop(asset, (event) => {
    if (emit) emit(event);
    broadcastToFeed(event);
  });

  const decision = assessRisk(verdict);
  const fullVerdict = { ...verdict, riskAction: decision.action, riskReason: decision.reason };

  // Save to history
  await saveVerdict({
    ...fullVerdict,
    sourcesChecked: JSON.stringify(fullVerdict.sourcesChecked)
  });

  // Update Cache
  analysisCache.set(asset, {
    verdict: fullVerdict,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  // Final broadcast
  const finalEvent: AgentEvent = {
    type: 'verdict',
    verdict: fullVerdict
  };

  if (emit) emit(finalEvent);
  broadcastToFeed(finalEvent);

  return fullVerdict;
}
