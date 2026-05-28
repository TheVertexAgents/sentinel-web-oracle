# lablab.ai Submission — Sentinel Web Oracle

## Project Title
**Sentinel Web Oracle**

## Short Description (≤ 160 chars)
Autonomous AI agent that monitors the open web for crypto threats in real time — exploits, flash loans, SEC actions — and fires a HOLD signal before damage is done.

## Long Description

### The Problem
DeFi protocols, crypto funds, and compliance teams have no reliable way to monitor the open web for threats in real time. By the time a flash loan exploit or SEC enforcement action appears in a data feed, the damage is already done. The web has the signal — but it's behind bot detection, JavaScript rendering, and geo-blocks that no internal SIEM was built to handle.

### What Sentinel Web Oracle Does
Sentinel Web Oracle is an autonomous threat intelligence agent that continuously monitors the open web for crypto-specific risk signals. Given any asset — a ticker, protocol name, or contract address — it:

1. **Disambiguates** the asset against live web sources to avoid false signals
2. **Fires parallel searches** across three risk vectors: exploit news, SEC/regulatory enforcement, flash loan attacks — all scoped to the last 24 hours
3. **Scrapes and reads full articles** to verify headlines before escalating — no hallucinated receipts
4. **Returns a structured verdict** with cited evidence: `CRITICAL / ELEVATED / NOMINAL` + `HOLD / MONITOR / CLEAR`

The agent is **conservative by design**: a false positive is better than a missed real attack.

### Why This Wasn't Possible Before
Every step of this pipeline hits the wall that Bright Data was built to break:
- Google SERP results require structured extraction at scale → **SERP API**
- News archives and crypto blogs block scrapers → **Web Unlocker**
- Twitter/X, Reddit, TradingView require JavaScript rendering → **Scraping Browser**
- The whole pipeline needs to be callable from any AI agent → **MCP Server**

Without Bright Data's infrastructure, this agent would be throttled, blocked, or working from stale cached data within minutes.

### Architecture

```
User / MCP Client / Dashboard
         │
         ▼
  Express HTTP Server (port 3008)
  ├── GET  /          → Live UI dashboard
  ├── POST /analyze   → JSON response
  └── GET  /stream    → SSE real-time events
         │
         ▼
  Agentic Loop (Groq llama-3.3-70b-versatile)
  ├── Tool: search_web      → Bright Data SERP API
  ├── Tool: scrape_url      → Bright Data Web Unlocker
  └── Tool: browser_scrape  → Bright Data Scraping Browser
         │
         ▼
  Risk Assessment Engine
  └── HOLD / MONITOR / CLEAR
```

### MCP Integration
The Oracle exposes two MCP tools:
- `analyze_crypto_threat(asset)` — full 4-step analysis for a single asset
- `batch_threat_scan(assets[])` — parallel scan of up to 5 assets

Any MCP-compatible client (Claude Desktop, Cursor, LangChain, CrewAI) can call these tools directly.

### Enterprise Value
This is the threat intelligence layer that DeFi protocols, crypto funds, and compliance teams plug into their risk stack. It replaces a team of analysts manually monitoring Telegram, Twitter, and news sites — and it responds in under 60 seconds.

**Target buyers:**
- DeFi protocols needing automated exploit detection
- Crypto hedge funds with compliance obligations
- Risk management platforms integrating threat signals into trading systems

### Bright Data Tools Used
| Tool | Zone | Purpose |
|---|---|---|
| SERP API | `serp_api1` | Structured Google search results for headline discovery |
| Web Unlocker | `web_unlocker1` | Full article extraction from news sites and blogs |
| Scraping Browser | `scraping_browser1` | JS-heavy sources: Twitter/X, Reddit, TradingView |
| MCP Server | — | Direct agent-to-agent integration via MCP protocol |

### Built With Kiro
This entire project was scaffolded, structured, debugged, and iterated using **Kiro** — Bright Data's partner AI development platform. Kiro was used to:
- Design and scaffold the full `src/` directory structure
- Implement the provider-agnostic LLM abstraction layer
- Debug Bright Data API response format issues in real time
- Build the SSE streaming endpoint and live UI dashboard
- Wire the MCP server integration

## Technology Tags
- Bright Data SERP API
- Bright Data Web Unlocker
- Bright Data Scraping Browser
- Bright Data MCP Server
- Groq
- Llama 3.3
- TypeScript
- Express
- MCP (Model Context Protocol)
- Kiro

## Track
**Track 3: Security & Compliance**

## GitHub Repository
https://github.com/TheVertexAgents/sentinel-web-oracle

## Demo Video Script (2 minutes)

**[0:00–0:15] Hook**
"Every DeFi protocol, every crypto fund, every compliance team faces the same problem: by the time a flash loan exploit shows up in your feed, the money is already gone. Sentinel Web Oracle solves this."

**[0:15–0:35] Show the UI**
Open `http://localhost:3008`. Type "ETH" in the input box. Hit Analyze.
"Watch the agent work in real time — it's searching the live web right now using Bright Data's SERP API."

**[0:35–1:00] Show the live log**
Point to the activity log as tool calls appear.
"Each line is a live Bright Data API call. Search, scrape, verify. The agent reads the full article — not just the headline — before it escalates."

**[1:00–1:20] Show the verdict**
When the verdict card appears:
"CRITICAL. HOLD. Two confirmed sources. This is the signal that triggers an automatic position halt in a downstream risk system."

**[1:20–1:40] Show MCP**
Open Claude Desktop or terminal.
"And because we expose this as an MCP server, any AI agent — Claude, GPT, LangChain — can call it directly. One tool call. Structured verdict. No API docs needed."

**[1:40–2:00] Close**
"Sentinel Web Oracle. The threat intelligence layer your crypto risk stack was missing. Built on Bright Data's full infrastructure stack."
