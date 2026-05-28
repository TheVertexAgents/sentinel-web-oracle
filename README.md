# 🛡️ Sentinel Web Oracle

> **Autonomous crypto threat intelligence — powered by Bright Data's live web infrastructure.**

[![Track](https://img.shields.io/badge/Track-Security%20%26%20Compliance-blue)](https://lablab.ai)
[![Bright Data](https://img.shields.io/badge/Bright%20Data-SERP%20%7C%20Unlocker%20%7C%20Browser%20%7C%20MCP-orange)](https://brightdata.com)
[![LLM](https://img.shields.io/badge/LLM-Groq%20llama--3.3--70b-green)](https://groq.com)
[![Built with Kiro](https://img.shields.io/badge/Built%20with-Kiro-purple)](https://kiro.dev)

---

## The Problem

DeFi protocols, crypto funds, and compliance teams have no reliable way to monitor the open web for threats in real time. By the time a flash loan exploit or SEC enforcement action appears in a data feed, the damage is already done.

The web has the signal — but it's behind bot detection, JavaScript rendering, and geo-blocks that no internal SIEM was built to handle.

---

## What It Does

Sentinel Web Oracle is an autonomous AI agent that monitors the open web for crypto-specific risk signals. Given any asset, it:

```
1. Disambiguates  →  Confirms canonical name + primary sources via SERP API
2. Multi-search   →  Parallel queries: exploit news, SEC enforcement, flash loans
3. Deep scrape    →  Reads full articles via Web Unlocker + Scraping Browser
4. Synthesizes    →  Returns CRITICAL / ELEVATED / NOMINAL + HOLD / MONITOR / CLEAR
```

Every call is a fresh live-web search. No stale cache. No hallucinated receipts.

---

## Live Demo

```bash
git clone https://github.com/TheVertexAgents/sentinel-web-oracle
cd sentinel-web-oracle
cp .env.example .env   # add your keys
npm install
npm run dev            # → http://localhost:3008
```

**Dashboard:** `http://localhost:3008`
**API:** `POST http://localhost:3008/analyze`
**SSE stream:** `GET http://localhost:3008/stream?asset=ETH`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Sentinel Web Oracle                       │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  Web UI  │   │  REST API    │   │   MCP Server       │  │
│  │ (port    │   │  /analyze    │   │  analyze_crypto_   │  │
│  │  3008)   │   │  /stream SSE │   │  threat()          │  │
│  └────┬─────┘   └──────┬───────┘   └─────────┬──────────┘  │
│       └────────────────┴─────────────────────┘             │
│                         │                                   │
│              ┌──────────▼──────────┐                        │
│              │   Agentic Loop      │                        │
│              │  (Groq / Anthropic) │                        │
│              └──────────┬──────────┘                        │
│                         │                                   │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│   search_web       scrape_url    browser_scrape             │
│   SERP API         Web Unlocker  Scraping Browser           │
│   (headlines)      (articles)    (Twitter/Reddit)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Bright Data Infrastructure

| Tool | Zone | Purpose |
|---|---|---|
| **SERP API** | `serp_api1` | Structured Google search — headline discovery |
| **Web Unlocker** | `web_unlocker1` | Full article extraction — bypasses bot detection |
| **Scraping Browser** | `scraping_browser1` | JS-heavy sources: Twitter/X, Reddit, TradingView |
| **MCP Server** | — | Direct agent-to-agent integration |

---

## API Reference

### `POST /analyze`
```bash
curl -X POST http://localhost:3008/analyze \
  -H "Content-Type: application/json" \
  -d '{"asset": "ETH"}'
```

```json
{
  "asset": "ETH",
  "threatLevel": "CRITICAL",
  "summary": "Flash loan exploit targeting ETH-based DeFi protocol confirmed.",
  "evidence": [
    { "title": "ETH exploit drains $4.2M from protocol", "url": "https://..." }
  ],
  "timestamp": "2026-05-28T10:42:00Z",
  "riskAction": "HOLD",
  "riskReason": "Critical threat detected. Immediate halt recommended."
}
```

### `GET /stream?asset=ETH`
Server-Sent Events stream. Emits events as the agent works:
```
data: {"type":"tool_call","tool":"search_web","input":{"query":"ETH exploit news last 24h"}}
data: {"type":"tool_result","tool":"search_web","result":"[{\"title\":\"..."}]"}
data: {"type":"tool_call","tool":"scrape_url","input":{"url":"https://coindesk.com/..."}}
data: {"type":"verdict","verdict":{"threatLevel":"CRITICAL","riskAction":"HOLD",...}}
```

---

## MCP Integration

Add to your Claude Desktop / Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "sentinel-web-oracle": {
      "command": "npx",
      "args": ["ts-node", "/path/to/sentinel-web-oracle/src/mcp/server.ts"],
      "env": {
        "BRIGHTDATA_API_KEY": "your_key",
        "SERP_ZONE": "serp_api1",
        "UNLOCKER_ZONE": "web_unlocker1",
        "AI_PROVIDER": "groq",
        "GROQ_API_KEY": "your_key"
      }
    }
  }
}
```

**Available MCP tools:**
- `analyze_crypto_threat(asset)` — full 4-step analysis
- `batch_threat_scan(assets[])` — parallel scan of up to 5 assets

---

## Environment Variables

```env
BRIGHTDATA_API_KEY=       # Bright Data API key
SERP_ZONE=serp_api1       # SERP API zone name
UNLOCKER_ZONE=web_unlocker1
BROWSER_ZONE=scraping_browser1
AI_PROVIDER=groq          # groq | anthropic
AI_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=             # Free at console.groq.com
ANTHROPIC_API_KEY=        # Optional — only if AI_PROVIDER=anthropic
PORT=3008
```

---

## Risk Decision Matrix

| Threat Level | Risk Action | Meaning |
|---|---|---|
| `CRITICAL` | `HOLD` | Confirmed exploit or SEC action — halt exposure immediately |
| `ELEVATED` | `MONITOR` | Suspicious signals — watch closely, reduce position |
| `NOMINAL` | `CLEAR` | No significant threats detected |

The agent is **conservative by design**: a false positive is better than a missed real attack.

---

## Built With Kiro

This project was built end-to-end using **[Kiro](https://kiro.dev)** — the AI-powered development platform by AWS. Kiro was used to scaffold the architecture, implement the LLM abstraction layer, debug Bright Data API integrations, build the SSE streaming endpoint, and wire the MCP server — all through natural language iteration.

---

## Hackathon

**Event:** [Web Data UNLOCKED — Bright Data AI Agents Hackathon](https://lablab.ai)
**Dates:** May 25–31, 2026
**Track:** Security & Compliance
**Team:** NullSentinel

---

## License

MIT
