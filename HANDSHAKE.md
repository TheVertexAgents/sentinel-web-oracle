# Sentinel Web Oracle — Agent Handshake

> This document is the authoritative context packet for any agent that needs to
> interact with, extend, or integrate against this service. Read it fully before
> sending your first prompt.

---

## 1. What This Service Is

**Sentinel Web Oracle** is a live-web crypto threat-intelligence microservice.
Given a crypto asset name it:

1. Searches the live web for recent exploit / regulatory news (Bright Data SERP)
2. Scrapes suspicious article URLs for full text (Bright Data Web Unlocker)
3. Runs a 4-step agentic reasoning loop powered by `claude-sonnet-4-20250514`
4. Returns a structured `ThreatVerdict` + a `RiskDecision` (HOLD / MONITOR / CLEAR)

It is **not** a data-feed poller. Every call triggers a fresh live-web search.

---

## 2. Repository

| Field | Value |
|---|---|
| GitHub | `https://github.com/TheVertexAgents/sentinel-web-oracle` |
| Branch | `main` |
| Last commit | `62f08f9` — "restructure: scaffold src/ layout, add missing files, fix SDK version" |
| Local path (WSL) | `~/hackathons/sentinel-web-oracle` |

---

## 3. Directory Structure

```
sentinel-web-oracle/
├── src/
│   ├── index.ts                        ← Express server (port 3008)
│   ├── config/
│   │   └── zones.ts                    ← All env vars + Bright Data zone config
│   ├── tools/
│   │   ├── searchWeb.ts                ← Bright Data SERP API (Google search)
│   │   ├── scrapeUrl.ts                ← Bright Data Web Unlocker
│   │   └── browserScrape.ts            ← Bright Data Scraping Browser (JS-heavy pages)
│   └── logic/
│       ├── agentLoop.ts                ← Core agentic loop + ThreatVerdict type
│       ├── llm/
│       │   ├── types.ts                ← LLMClient interface + shared types
│       │   ├── factory.ts              ← Reads AI_PROVIDER, returns correct client
│       │   ├── anthropicClient.ts      ← Anthropic adapter
│       │   └── groqClient.ts           ← Groq adapter (default)
│       ├── clients/
│       │   └── web_oracle_client.ts    ← HTTP client (use this to call the service)
│       └── strategy/
│           └── risk_assessment.ts      ← HOLD / MONITOR / CLEAR decision logic
├── .env                                ← Live secrets (never commit)
├── .env.example                        ← Key template (no values)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Running the Service

```bash
# Install (already done — node_modules present)
npm install

# Start dev server
npm run dev          # ts-node src/index.ts → port 3008

# Type-check only (no emit)
npx tsc --noEmit     # must exit 0
```

> **Note:** Port 3008 may be occupied in the current WSL environment by another
> process. Override with `PORT=3099 npm run dev` if needed.

---

## 5. HTTP API

### `GET /health`

Liveness check. No auth required.

**Response**
```json
{ "status": "ok", "service": "sentinel-web-oracle", "port": 3008 }
```

---

### `POST /analyze`

Trigger a full threat analysis for a crypto asset.

**Request**
```json
{ "asset": "ETH" }
```

`asset` — any string: ticker symbol, full name, or contract address.

**Response**
```typescript
{
  asset:      string;                          // echoed back
  threatLevel: "CRITICAL" | "ELEVATED" | "NOMINAL";
  summary:    string;                          // human-readable finding
  evidence:   { title: string; url: string }[]; // scraped sources
  timestamp:  string;                          // ISO-8601, time of analysis
  riskAction: "HOLD" | "MONITOR" | "CLEAR";
  riskReason: string;                          // plain-English rationale
}
```

**Error responses**
| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "Missing or invalid \"asset\" field..." }` | Bad request body |
| 500 | `{ "error": "Analysis failed.", "detail": "..." }` | Internal / API error |

---

## 6. Risk Decision Matrix

| `threatLevel` | `riskAction` | Meaning |
|---|---|---|
| `CRITICAL` | `HOLD` | Confirmed exploit or SEC action — halt exposure immediately |
| `ELEVATED` | `MONITOR` | Suspicious signals — watch closely, reduce position size |
| `NOMINAL` | `CLEAR` | No significant threats detected |

The agent is **conservative by design**: a false positive (CRITICAL with no real
threat) is preferred over a missed real attack.

---

## 7. Internal Client (for agent-to-agent calls)

Import `src/logic/clients/web_oracle_client.ts` if you are a TypeScript agent
running in the same monorepo:

```typescript
import { analyzeAsset, healthCheck } from './src/logic/clients/web_oracle_client';

// Check the service is up
const alive = await healthCheck();  // → boolean

// Run a full analysis
const result = await analyzeAsset('BTC');
// result.riskAction → "HOLD" | "MONITOR" | "CLEAR"
// result.threatLevel → "CRITICAL" | "ELEVATED" | "NOMINAL"
```

The client reads `process.env.PORT` (default `3008`) for the base URL.

---

## 8. Environment Variables

All vars are loaded from `.env` via `dotenv` in `src/config/zones.ts`.

| Key | Default | Required | Purpose |
|---|---|---|---|
| `BRIGHTDATA_API_KEY` | — | ✅ | Bearer token for all Bright Data API calls |
| `SERP_ZONE` | `serp_api1` | ✅ | Bright Data zone for Google SERP searches |
| `UNLOCKER_ZONE` | `web_unlocker1` | ✅ | Bright Data zone for Web Unlocker scraping |
| `BROWSER_ZONE` | `scraping_browser1` | ✅ | Bright Data zone for Scraping Browser |
| `AI_PROVIDER` | `groq` | — | LLM backend: `groq` or `anthropic` |
| `AI_MODEL` | `llama-3.3-70b-versatile` | — | Model name for the selected provider |
| `GROQ_API_KEY` | — | ✅ (if `AI_PROVIDER=groq`) | Groq API key — free tier at console.groq.com |
| `ANTHROPIC_API_KEY` | — | ✅ (if `AI_PROVIDER=anthropic`) | Claude API key |
| `PORT` | `3008` | — | HTTP server port |

> **Active config:** `AI_PROVIDER=groq`, `AI_MODEL=llama-3.3-70b-versatile`, `GROQ_API_KEY` is set in `.env`.
> The service is ready to run live with no Anthropic key required.

---

## 9. Key Dependencies

| Package | Version | Role |
|---|---|---|
| `@anthropic-ai/sdk` | `^0.39.0` | Claude adapter (used when `AI_PROVIDER=anthropic`) |
| `groq-sdk` | `^1.2.1` | Groq adapter — default provider, free tier |
| `express` | `^4.18.0` | HTTP server |
| `axios` | `^1.6.0` | Bright Data API calls |
| `dotenv` | `^16.0.0` | Env var loading |
| `typescript` | `^5.0.0` | Build toolchain |
| `ts-node` | `^10.9.0` | Dev runner |

---

## 10. Completed Tasks (as of commit `62f08f9` + Groq refactor)

- [x] Scaffolded `src/` directory tree with all subdirectories
- [x] Moved `index.ts`, `agentLoop.ts`, `searchWeb.ts`, `scrapeUrl.ts` from root → correct `src/` paths
- [x] Created `src/config/zones.ts` — centralised env/config (now includes `AI_PROVIDER`, `AI_MODEL`, `GROQ_API_KEY`)
- [x] Created `src/tools/browserScrape.ts` — Scraping Browser tool
- [x] Created `src/logic/clients/web_oracle_client.ts` — HTTP client
- [x] Created `src/logic/strategy/risk_assessment.ts` — HOLD/MONITOR/CLEAR logic
- [x] Created `tsconfig.json` with correct `rootDir`/`outDir`
- [x] Created `.env.example` and `.gitignore`
- [x] Fixed `.env`: renamed `BRIGHT_DATA_API_KEY` → `BRIGHTDATA_API_KEY`, added all missing keys
- [x] Upgraded `@anthropic-ai/sdk` `^0.20.0` → `^0.39.0` (tool-use type support)
- [x] Added `groq-sdk@^1.2.1` as a dependency
- [x] Created `src/logic/llm/` abstraction layer (`types.ts`, `factory.ts`, `anthropicClient.ts`, `groqClient.ts`)
- [x] Refactored `agentLoop.ts` to use provider-agnostic `LLMClient` interface
- [x] Added `AI_PROVIDER=groq`, `AI_MODEL=llama-3.3-70b-versatile`, `GROQ_API_KEY` to `.env` and `.env.example`
- [x] `npx tsc --noEmit` → 0 errors
- [x] `/health` endpoint verified live: `{"status":"ok","service":"sentinel-web-oracle","port":3099}`
- [x] `npm install` → 0 vulnerabilities
- [x] Committed and pushed to `main`

---

## 11. What Is NOT Done Yet (open work for next agent)

- [ ] `browserScrape` tool is implemented but **not wired into `agentLoop.ts`** — only `search_web` and `scrape_url` are registered as tools
- [ ] No authentication / rate-limiting on the `/analyze` endpoint
- [ ] No retry logic on Bright Data API failures
- [ ] No test suite exists
- [ ] `README.md` has not been updated to reflect the new structure

---

## 12. First Prompt Suggestion for Consuming Agent

If you are an agent picking this up, a safe first prompt is:

```
Service: sentinel-web-oracle
Base URL: http://localhost:3008
Health check: GET /health → {"status":"ok"}
Analyze endpoint: POST /analyze  body: {"asset":"<TICKER>"}
I need you to [YOUR TASK HERE].
Refer to HANDSHAKE.md for full API contract, types, and env requirements.
```
