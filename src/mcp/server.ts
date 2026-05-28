/**
 * Sentinel Web Oracle — MCP Server
 *
 * Exposes the Oracle's threat analysis capability as an MCP tool so any
 * MCP-compatible client (Claude Desktop, Cursor, LangChain, CrewAI, etc.)
 * can call it directly without knowing about the HTTP API.
 *
 * Run standalone:  npx ts-node src/mcp/server.ts
 * Or via npm:      npm run mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runAgentLoop } from '../logic/agentLoop';
import { assessRisk } from '../logic/strategy/risk_assessment';

const server = new McpServer({
  name: 'sentinel-web-oracle',
  version: '1.0.0',
});

// ── Tool: analyze_crypto_threat ───────────────────────────────────────────────
server.tool(
  'analyze_crypto_threat',
  'Analyze whether a crypto asset is currently under a critical threat. ' +
  'Searches the live web via Bright Data SERP API, scrapes suspicious articles ' +
  'via Web Unlocker and Scraping Browser, then returns a structured verdict: ' +
  'CRITICAL / ELEVATED / NOMINAL with cited evidence and a risk action (HOLD / MONITOR / CLEAR).',
  {
    asset: z.string().describe(
      'The crypto asset to analyze. Can be a ticker (BTC, ETH, SOL), ' +
      'full name (Bitcoin, Ethereum), or protocol name (Uniswap, Aave).'
    ),
  },
  async ({ asset }) => {
    try {
      const verdict = await runAgentLoop(asset);
      const decision = assessRisk(verdict);

      const result = { ...verdict, riskAction: decision.action, riskReason: decision.reason };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing ${asset}: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: batch_threat_scan ───────────────────────────────────────────────────
server.tool(
  'batch_threat_scan',
  'Scan multiple crypto assets for threats in a single call. ' +
  'Returns a summary table with threat levels and risk actions for each asset.',
  {
    assets: z.array(z.string()).min(1).max(5).describe(
      'List of crypto assets to scan (max 5). E.g. ["BTC", "ETH", "SOL"]'
    ),
  },
  async ({ assets }) => {
    const results = await Promise.allSettled(
      assets.map(async (asset) => {
        const verdict = await runAgentLoop(asset);
        const decision = assessRisk(verdict);
        return { asset, threatLevel: verdict.threatLevel, riskAction: decision.action, summary: verdict.summary };
      })
    );

    const rows = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        const v = r.value;
        return `${v.asset.padEnd(10)} ${v.threatLevel.padEnd(10)} ${v.riskAction.padEnd(8)} ${v.summary.substring(0, 60)}`;
      }
      return `${assets[i].padEnd(10)} ERROR      -        ${(r as PromiseRejectedResult).reason?.message || 'unknown'}`;
    });

    const table = [
      'ASSET      THREAT     ACTION   SUMMARY',
      '─'.repeat(80),
      ...rows,
    ].join('\n');

    return {
      content: [{ type: 'text', text: table }],
    };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Sentinel Web Oracle MCP server running on stdio');
}

main().catch((err) => {
  console.error('[MCP] Fatal:', err);
  process.exit(1);
});
