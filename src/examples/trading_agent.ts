/**
 * Reference Trading Agent — Direct MCP Integration
 *
 * This example demonstrates how an AI Trading Agent integrates with Sentinel
 * via MCP to protect its portfolio. It uses the "analyze_crypto_threat" tool
 * before opening a position and subscribes to the live feed for risk management.
 */

import axios from 'axios';

const SENTINEL_MCP_URL = 'http://localhost:3009/sse';
const API_KEY = 'sentinel-dev-key';

async function simulateTradingAgent() {
  console.log('🤖 [TradingAgent] Starting integrated trading session...');

  // 1. Initial health check
  // (In a real scenario, the agent would use the MCP SDK to call 'oracle_health')
  console.log('🤖 [TradingAgent] Checking Sentinel Oracle health...');

  // 2. Pre-trade check for ETH
  console.log('🤖 [TradingAgent] Pre-trade check: Is it safe to buy ETH?');

  // We'll simulate the tool call here since we are a reference script
  // In a real agent (like Claude), this happens via tool use.
  try {
    // For the sake of the demo script, we use the HTTP API if available,
    // but the intention is to show the MCP logic.
    console.log('🤖 [TradingAgent] Calling MCP Tool: analyze_crypto_threat("ETH")');

    // Simulating the result of an MCP tool call
    const mockVerdict = {
      asset: 'ETH',
      threatLevel: 'NOMINAL',
      riskAction: 'CLEAR',
      confidenceScore: 95,
      summary: 'No active exploits or regulatory threats found in the last 4 hours.'
    };

    if (mockVerdict.riskAction === 'CLEAR') {
      console.log(`✅ [TradingAgent] Safe to trade ETH. Confidence: ${mockVerdict.confidenceScore}%`);
      console.log('🤖 [TradingAgent] EXECUTING BUY: 10 ETH at Market');
    } else {
      console.log(`⚠️ [TradingAgent] Trade ABORTED. Reason: ${mockVerdict.summary}`);
    }

  } catch (err: any) {
    console.error('❌ [TradingAgent] Failed to reach Sentinel Oracle:', err.message);
  }

  // 3. Subscribe to the Live Threat Feed (SSE)
  console.log('🤖 [TradingAgent] Subscribing to sentinel://threat-feed for real-time protection...');

  // This simulates the agent listening for push notifications from the MCP server
  const mockSseStream = [
    { type: 'threat-alert', asset: 'SOL', threatLevel: 'CRITICAL', summary: 'Major flash loan exploit confirmed on Solana mainnet' }
  ];

  setTimeout(() => {
    const alert = mockSseStream[0];
    console.log(`🚨 [TradingAgent] ALERT RECEIVED via Sentinel MCP: ${alert.threatLevel} threat on ${alert.asset}`);
    console.log(`🤖 [TradingAgent] RISK MITIGATION: Pausing all ${alert.asset} positions immediately.`);
    console.log(`🤖 [TradingAgent] REASON: ${alert.summary}`);
  }, 3000);

  console.log('🤖 [TradingAgent] Monitoring active. Waiting for signals...');
}

simulateTradingAgent();
