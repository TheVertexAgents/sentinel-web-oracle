import express from 'express';
import dotenv from 'dotenv';
import { runAgentLoop } from './logic/agentLoop';
import { assessRisk } from './logic/strategy/risk_assessment';
import { config } from './config/zones';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sentinel-web-oracle', port: config.server.port });
});

app.post('/analyze', async (req, res) => {
  const { asset } = req.body;

  if (!asset || typeof asset !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "asset" field in request body.' });
  }

  console.log(`[Oracle] Analyzing threat for asset: ${asset}`);

  try {
    const verdict = await runAgentLoop(asset);
    const decision = assessRisk(verdict);

    console.log(`[Oracle] Verdict: ${verdict.threatLevel} → Action: ${decision.action}`);

    return res.json({
      ...verdict,
      riskAction: decision.action,
      riskReason: decision.reason,
    });
  } catch (err: any) {
    console.error('[Oracle] Error during analysis:', err.message);
    return res.status(500).json({ error: 'Analysis failed.', detail: err.message });
  }
});

app.listen(config.server.port, () => {
  console.log(`🛡️  Sentinel Web Oracle running on port ${config.server.port}`);
});
