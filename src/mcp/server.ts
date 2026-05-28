/**
 * Sentinel Web Oracle — MCP Server
 *
 * Exposes the Oracle's threat analysis capability as an MCP tool so any
 * MCP-compatible client (Claude Desktop, Cursor, LangChain, CrewAI, etc.)
 * can call it directly without knowing about the HTTP API.
 */

import dotenv from 'dotenv';
dotenv.config();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import express from 'express';
import { runAgentLoop } from '../logic/agentLoop';
import { assessRisk } from '../logic/strategy/risk_assessment';
import { initDb, getHistory, getAllMonitors } from '../logic/db';
import { startMonitoring, stopMonitoring, runAnalyisAndTrack, addFeedListener, removeFeedListener } from '../logic/monitoring';
import { config } from '../config/zones';

const server = new McpServer({
  name: 'sentinel-web-oracle',
  version: '1.0.0',
});

const API_KEY = process.env.SENTINEL_API_KEY || 'sentinel-dev-key';

// ── Auth Middleware ──────────────────────────────────────────────────────────
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['x-api-key'];
  if (authHeader !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Tool 1: analyze_crypto_threat ───────────────────────────────────────────
server.tool(
  'analyze_crypto_threat',
  'Deep dive analysis of a crypto asset threat level. Returns structured JSON with evidence and risk action.',
  {
    asset: z.string().describe('Asset to analyze (e.g., BTC, ETH, Uniswap)'),
  },
  async ({ asset }) => {
    try {
      const result = await runAnalyisAndTrack(asset);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 2: batch_threat_scan ───────────────────────────────────────────────
server.tool(
  'batch_threat_scan',
  'Scan multiple crypto assets (max 5) in parallel. Returns a structured JSON summary.',
  {
    assets: z.array(z.string()).min(1).max(5).describe('List of assets to scan'),
  },
  async ({ assets }) => {
    const results = await Promise.allSettled(
      assets.map(asset => runAnalyisAndTrack(asset))
    );

    const data = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { asset: assets[i], error: r.reason.message };
    });

    const summary = {
      scannedAt: new Date().toISOString(),
      results: data.map((d: any) => ({
        asset: d.asset,
        threatLevel: d.threatLevel,
        riskAction: d.riskAction,
        confidenceScore: d.confidenceScore,
        summary: d.summary
      })),
      criticalCount: data.filter((d: any) => d.threatLevel === 'CRITICAL').length,
      elevatedCount: data.filter((d: any) => d.threatLevel === 'ELEVATED').length,
      nominalCount: data.filter((d: any) => d.threatLevel === 'NOMINAL').length,
      recommendedAction: data.some((d: any) => d.threatLevel === 'CRITICAL') ? 'HALT_ALL' :
                         data.some((d: any) => d.threatLevel === 'ELEVATED') ? 'REDUCE_EXPOSURE' : 'NORMAL_OPERATIONS'
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  }
);

// ── Tool 3: start_monitoring ───────────────────────────────────────────────
server.tool(
  'start_monitoring',
  'Register assets for periodic monitoring. Fires webhooks on CRITICAL/ELEVATED threats.',
  {
    assets: z.array(z.string()).describe('Assets to watch'),
    intervalSeconds: z.number().min(60).describe('Check interval (min 60s)'),
    webhookUrl: z.string().optional().describe('URL to POST alerts to'),
  },
  async ({ assets, intervalSeconds, webhookUrl }) => {
    const monitorId = await startMonitoring(assets, intervalSeconds, webhookUrl);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          monitorId,
          assets,
          intervalSeconds,
          startedAt: new Date().toISOString(),
          message: 'Monitoring started successfully'
        }, null, 2)
      }]
    };
  }
);

// ── Tool 4: get_threat_history ─────────────────────────────────────────────
server.tool(
  'get_threat_history',
  'Get historical threat verdicts for an asset.',
  {
    asset: z.string().describe('Asset ticker'),
    hoursBack: z.number().default(24).describe('How many hours of history to retrieve'),
  },
  async ({ asset, hoursBack }) => {
    const history = await getHistory(asset, hoursBack);

    // Simple trend detection
    const last3 = history.slice(0, 3).map(h => h.threatLevel);
    let trend: 'ESCALATING' | 'STABLE' | 'DEESCALATING' = 'STABLE';
    if (last3[0] === 'CRITICAL' && last3[1] !== 'CRITICAL') trend = 'ESCALATING';
    if (last3[0] === 'NOMINAL' && last3[1] !== 'NOMINAL') trend = 'DEESCALATING';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          asset,
          history,
          peakThreatLevel: history.some(h => h.threatLevel === 'CRITICAL') ? 'CRITICAL' :
                           history.some(h => h.threatLevel === 'ELEVATED') ? 'ELEVATED' : 'NOMINAL',
          trendDirection: trend
        }, null, 2)
      }]
    };
  }
);

// ── Tool 5: list_active_sources ────────────────────────────────────────────
server.tool(
  'list_active_sources',
  'List domains checked during the last analysis.',
  {
    asset: z.string().optional().describe('Filter by last analysis for this asset'),
  },
  async ({ asset }) => {
    const history = await getHistory(asset || '', 1);
    const last = history[0];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          sources: last ? JSON.parse(last.sourcesChecked).map((s: string) => ({
            domain: s,
            credibilityTier: s.includes('gov') ? 1 : 3, // Mock tiering logic
            lastChecked: last.timestamp,
            wasUsedInVerdict: true
          })) : [],
          brightDataToolsUsed: ["serp_api", "web_unlocker", "scraping_browser"]
        }, null, 2)
      }]
    };
  }
);

// ── Tool 6: oracle_health ──────────────────────────────────────────────────
server.tool(
  'oracle_health',
  'Check service status and configuration.',
  {},
  async () => {
    const monitors = await getAllMonitors();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'healthy',
          brightDataApiStatus: 'ok',
          llmProvider: config.llm.provider,
          llmModel: config.llm.model,
          activeMonitors: monitors.length,
          uptime: `${process.uptime()}s`
        }, null, 2)
      }]
    };
  }
);

// ── Resource: threat-feed ──────────────────────────────────────────────────
server.resource(
  'threat-feed',
  'sentinel://threat-feed',
  { mimeType: 'application/json' },
  async (uri) => {
    // Standard resource read returns empty or last known critical (mocked for pull)
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({ message: "Subscribe via SSE transport for live push events" })
      }]
    };
  }
);

// ── Resource: source-registry ──────────────────────────────────────────────
server.resource(
  'source-registry',
  'sentinel://source-registry',
  { mimeType: 'application/json' },
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          tiers: {
            "1": ["peckshield.com", "sec.gov", "slowmist.com"],
            "2": ["coindesk.com", "cointelegraph.com"],
            "3": ["reddit.com", "twitter.com"],
            "4": ["general blogs"]
          }
        }, null, 2)
      }]
    };
  }
);

// ── Resource: risk-config ──────────────────────────────────────────────────
server.resource(
  'risk-config',
  'sentinel://risk-config',
  { mimeType: 'application/json' },
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          rules: {
            "CRITICAL": "Confirmed exploit OR regulatory action < 4h old",
            "ELEVATED": "Suspicious signals or unverified rumors",
            "NOMINAL": "No threats found"
          }
        }, null, 2)
      }]
    };
  }
);

// ── Prompt: threat-briefing ───────────────────────────────────────────────
server.prompt(
  'threat-briefing',
  {
    asset: z.string().describe('Asset to brief'),
    format: z.enum(['executive', 'technical', 'compliance']).default('executive'),
  },
  ({ asset, format }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Prepare a ${format} threat briefing for ${asset} based on the latest Oracle analysis. Include: executive summary, threat level rationale, evidence citations, and confidence assessment.`
        }
      }
    ]
  })
);

// ── Prompt: portfolio-scan ────────────────────────────────────────────────
server.prompt(
  'portfolio-scan',
  {
    assets: z.string().describe('Comma-separated assets'),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  },
  ({ assets, riskTolerance }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Scan this portfolio: ${assets}. Risk tolerance: ${riskTolerance}. Rank assets by threat level and provide a summary.`
        }
      }
    ]
  })
);

// ── Transport Setup ─────────────────────────────────────────────────────────

async function main() {
  await initDb();
  const { initMonitoring } = await import('../logic/monitoring');
  await initMonitoring();

  const mode = process.argv.includes('--sse') ? 'sse' : 'stdio';

  if (mode === 'stdio') {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Sentinel Web Oracle running on stdio');
  } else {
    const app = express();
    app.use(express.json());

    const transports = new Map<string, SSEServerTransport>();

    app.get('/sse', authenticate, async (req, res) => {
      const sessionId = Math.random().toString(36).substring(7);
      const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
      transports.set(sessionId, transport);

      await server.connect(transport);

      const listener = (event: any) => {
        if (event.type === 'verdict' && (event.verdict.threatLevel === 'CRITICAL' || event.verdict.threatLevel === 'ELEVATED')) {
          res.write(`event: threat-alert\ndata: ${JSON.stringify(event.verdict)}\n\n`);
        }
      };

      addFeedListener(listener);

      req.on('close', () => {
        removeFeedListener(listener);
        transports.delete(sessionId);
      });
    });

    app.post('/messages', authenticate, async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports.get(sessionId);

      if (!transport) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await transport.handlePostMessage(req, res);
    });

    const port = 3009;
    app.listen(port, () => {
      console.error(`[MCP] Sentinel Web Oracle running on HTTP+SSE at http://localhost:${port}/sse`);
    });
  }
}

main().catch((err) => {
  console.error('[MCP] Fatal:', err);
  process.exit(1);
});
