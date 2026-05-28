import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { runAgentLoop } from './logic/agentLoop';
import { assessRisk } from './logic/strategy/risk_assessment';
import { config } from './config/zones';
import type { AgentEvent } from './logic/agentLoop';
import { initDb } from './logic/db';
import { initMonitoring, runAnalyisAndTrack } from './logic/monitoring';

dotenv.config();

const app = express();
app.use(express.json());

// Serve the static UI from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sentinel-web-oracle', port: config.server.port });
});

// ── Standard JSON endpoint (existing) ────────────────────────────────────────
app.post('/analyze', async (req, res) => {
  const { asset } = req.body;
  if (!asset || typeof asset !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "asset" field.' });
  }

  console.log(`[Oracle] Analyzing: ${asset}`);
  try {
    const fullVerdict = await runAnalyisAndTrack(asset);
    console.log(`[Oracle] Verdict: ${fullVerdict.threatLevel} → ${fullVerdict.riskAction}`);
    return res.json(fullVerdict);
  } catch (err: any) {
    console.error('[Oracle] Error:', err.message);
    return res.status(500).json({ error: 'Analysis failed.', detail: err.message });
  }
});

// ── SSE streaming endpoint ────────────────────────────────────────────────────
// GET /stream?asset=ETH
// Emits newline-delimited JSON events as the agent works, then closes.
app.get('/stream', async (req, res) => {
  const asset = req.query.asset as string;
  if (!asset) {
    return res.status(400).json({ error: 'Missing ?asset= query param.' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (event: AgentEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  console.log(`[Oracle/SSE] Analyzing: ${asset}`);

  try {
    const fullVerdict = await runAnalyisAndTrack(asset, send);
    console.log(`[Oracle/SSE] Verdict: ${fullVerdict.threatLevel} → ${fullVerdict.riskAction}`);
  } catch (err: any) {
    console.error('[Oracle/SSE] Error:', err.message);
    send({ type: 'error', message: err.message });
  }

  res.end();
});

async function main() {
  await initDb();
  await initMonitoring();

  app.listen(config.server.port, () => {
    console.log(`🛡️  Sentinel Web Oracle running on port ${config.server.port}`);
    console.log(`   UI → http://localhost:${config.server.port}`);
    console.log(`   API → POST http://localhost:${config.server.port}/analyze`);
    console.log(`   SSE → GET  http://localhost:${config.server.port}/stream?asset=BTC`);
  });
}

main().catch(err => {
  console.error('[Fatal] Startup failed:', err);
  process.exit(1);
});
