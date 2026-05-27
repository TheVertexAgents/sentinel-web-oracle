# 🛡️ Sentinel Web Oracle

> **Agentic threat intelligence for crypto — powered by live web data.**  
> Built for the [Web Data UNLOCKED Hackathon](https://lablab.ai) · Track: **Security & Compliance**

---

## 🧠 What It Does

Sentinel Web Oracle is an autonomous AI agent that monitors the open web in real time to detect critical crypto threats before they cause damage — exploits, flash loan attacks, regulatory black swans, and more.

It doesn't just search. It **reasons**. Using a multi-step agentic loop, it:

1. **Disambiguates** the asset to avoid false signals
2. **Fires parallel searches** across multiple risk vectors
3. **Scrapes and reads full articles** to verify headlines
4. **Synthesizes a final verdict** with evidence links — no hallucinated receipts

If a confirmed exploit or regulatory cease-and-desist is found under 4 hours old, the agent returns `threatLevel: "CRITICAL"` and downstream risk systems respond automatically.

---

## 🏗️ Architecture

```
sentinel-web-oracle/
├── src/
│   ├── tools/
│   │   ├── searchWeb.ts          # SERP API — headline discovery
│   │   ├── scrapeUrl.ts          # Web Unlocker — full article extraction
│   │   └── browserScrape.ts      # Scraping Browser — JS-heavy sites (Twitter/X, TradingView)
│   ├── logic/
│   │   ├── agentLoop.ts          # Core tool-use reasoning loop (Claude / GPT-4o)
│   │   ├── synthesizer.ts        # Final verdict + evidence assembly
│   │   ├── clients/
│   │   │   └── web_oracle_client.ts   # Client connector (port 3008)
│   │   └── strategy/
│   │       └── risk_assessment.ts     # HOLD trigger on CRITICAL threat
│   ├── config/
│   │   └── zones.ts              # Bright Data zone configuration
│   └── index.ts                  # MCP Server entrypoint (port 3008)
├── docs/
│   └── architecture.md
├── .env.example
├── package.json
└── README.md
```

---

## ⚡ Bright Data Infrastructure

| Tool | Zone | Purpose |
|---|---|---|
| **SERP API** | `serp_api1` | High-level headline discovery (JSON) |
| **Web Unlocker** | `web_unlocker1` | Scraping news archives & blogs (RAW) |
| **Scraping Browser** | `scraping_browser1` | JS-heavy sites: Twitter/X, TradingView |

---

## 🤖 The Agentic Loop

```
User Query: "Is [ASSET] under threat?"
        │
        ▼
┌─────────────────────────┐
│  Step 1: Disambiguation  │  → Confirm canonical asset name & sources
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│  Step 2: Multi-Angle    │  → Parallel searches:
│  Discovery              │    · "[ASSET] exploit news last 24h"
│                         │    · "[ASSET] SEC enforcement"
│                         │    · "[ASSET] flash loan attack"
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│  Step 3: Deep Scrape &  │  → Full article extraction per headline
│  Verification           │    via Web Unlocker / Scraping Browser
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│  Step 4: Synthesis      │  → Verdict + evidence[] with source URLs
│  & Verdict              │    threatLevel: "CRITICAL" | "ELEVATED" | "NOMINAL"
└─────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/sentinel-web-oracle.git
cd sentinel-web-oracle
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
BRIGHTDATA_API_KEY=your_api_key_here
SERP_ZONE=serp_api1
UNLOCKER_ZONE=web_unlocker1
BROWSER_ZONE=scraping_browser1
ANTHROPIC_API_KEY=your_anthropic_key_here   # or OPENAI_API_KEY for GPT-4o
PORT=3008
```

### 3. Run the Oracle server

```bash
npm run dev
```

Server starts on **port 3008**.

### 4. Query the Oracle

```bash
curl -X POST http://localhost:3008/analyze \
  -H "Content-Type: application/json" \
  -d '{"asset": "Uniswap"}'
```

**Example response:**

```json
{
  "asset": "Uniswap",
  "threatLevel": "CRITICAL",
  "summary": "A flash loan exploit targeting Uniswap V3 pools was reported 2 hours ago across three verified sources.",
  "evidence": [
    { "title": "Uniswap V3 Flash Loan Attack — $4.2M drained", "url": "https://..." },
    { "title": "Certik Alert: Uniswap exploit confirmed", "url": "https://..." }
  ],
  "timestamp": "2026-05-28T10:42:00Z"
}
```

---

## 🔗 Integration with Vertex Sentinel

Sentinel Web Oracle is designed to integrate with the **Vertex Sentinel** risk management system:

- **Oracle** runs on port `3008`
- **Dashboard** runs on port `3005`
- **Socket Server** runs on port `3006`
- `risk_assessment.ts` triggers a `HOLD` automatically when `threatLevel === "CRITICAL"`

---

## 🏆 Hackathon Context

**Event**: [Web Data UNLOCKED — Bright Data AI Agents Hackathon](https://lablab.ai)  
**Dates**: May 25–31, 2026  
**Track**: Security & Compliance  
**Team**: NullSentinel  
**Builder**: Solo participant  

**Bright Data tools used**: SERP API · Web Unlocker · Scraping Browser · MCP Server

---

## 📄 License

MIT — built for the Web Data UNLOCKED Hackathon 2026.
