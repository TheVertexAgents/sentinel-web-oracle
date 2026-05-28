import { searchWeb, SearchResult } from '../tools/searchWeb';
import { scrapeUrl } from '../tools/scrapeUrl';
import { browserScrape } from '../tools/browserScrape';
import { getLLMClient } from './llm/factory';
import type { ToolDefinition, ConversationMessage, ToolCall } from './llm/types';

export interface ThreatVerdict {
  asset: string;
  threatLevel: 'CRITICAL' | 'ELEVATED' | 'NOMINAL';
  summary: string;
  evidence: { title: string; url: string; source: string; publishedAt?: string }[];
  timestamp: string;
  confidenceScore: number;
  sourcesChecked: string[];
  brightDataCallsUsed: number;
}

/** SSE event emitted during the agentic loop so the UI can show live progress. */
export interface AgentEvent {
  type: 'tool_call' | 'tool_result' | 'verdict' | 'error';
  tool?: string;
  input?: Record<string, unknown>;
  result?: string;
  verdict?: ThreatVerdict & { riskAction: string; riskReason: string };
  message?: string;
}

export type EventEmitter = (event: AgentEvent) => void;

const SYSTEM_PROMPT = `You are Sentinel Web Oracle, a conservative crypto threat intelligence agent.
Your job is to detect genuine security threats or regulatory actions against crypto assets.
Be extremely conservative: a false positive (calling CRITICAL when there is no threat) is BETTER than missing a real attack.

Source Credibility Tiers:
- Tier 1 (High): PeckShield, SlowMist, CertiKAlert, BlockSecTeam, SEC.gov, CFTC.gov
- Tier 2 (News): CoinDesk, CoinTelegraph, The Block, Decrypt
- Tier 3 (Social): Reddit (r/ethfinance, r/DeFi), Twitter/X

Only call CRITICAL if you have confirmed evidence from a Tier 1 or Tier 2 source that describes:
- A technical exploit, hack, or flash loan attack with specific dollar amounts or transaction hashes
- An official SEC/regulatory cease-and-desist or enforcement action
All evidence must be timestamped within the last 4 hours.

confidenceScore rubric:
- 90-100: Multiple verified Tier 1/2 sources, specific tx hashes, < 2h old
- 70-89: 2+ Tier 2 sources, < 4h old
- 50-69: Single source or unverified, > 4h old
- 0-49: Unconfirmed rumors, social media only

Always return a JSON object with:
- threatLevel: "CRITICAL" | "ELEVATED" | "NOMINAL"
- summary: string
- evidence: array of {title, url, source, publishedAt}
- confidenceScore: number (0-100)`;

const tools: ToolDefinition[] = [
  {
    name: 'search_web',
    description: 'Search the web for recent news about a crypto asset using Bright Data SERP API.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'scrape_url',
    description: 'Scrape the full text of an article URL using Bright Data Web Unlocker. Best for standard news sites.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to scrape' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_scrape',
    description: 'Scrape a JavaScript-heavy page using Bright Data Scraping Browser. Only use this for Twitter/X (twitter.com or x.com), Reddit (reddit.com), or TradingView URLs that require JavaScript rendering. For all other URLs use scrape_url instead.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL of the JS-heavy page to scrape (must be twitter.com, x.com, reddit.com, or tradingview.com)' },
      },
      required: ['url'],
    },
  },
];

async function runTool(
  call: ToolCall,
  emit?: EventEmitter,
  metrics?: { calls: number; sources: Set<string> }
): Promise<string> {
  let result: string;

  if (metrics) {
    metrics.calls += 1;
    if (call.input.url) {
      try {
        const domain = new URL(call.input.url as string).hostname;
        metrics.sources.add(domain);
      } catch (e) {
        // ignore invalid urls
      }
    }
  }

  try {
    if (call.name === 'search_web') {
      const results: SearchResult[] = await searchWeb(call.input.query as string);
      result = JSON.stringify(results);
    } else if (call.name === 'scrape_url') {
      result = await scrapeUrl(call.input.url as string);
    } else if (call.name === 'browser_scrape') {
      // Fallback to web unlocker if browser zone not configured
      try {
        result = await browserScrape(call.input.url as string);
      } catch {
        result = await scrapeUrl(call.input.url as string);
      }
    } else {
      result = 'Unknown tool';
    }
  } catch (err: any) {
    result = `Tool error: ${err.message}`;
  }

  if (emit) {
    emit({
      type: 'tool_result',
      tool: call.name,
      result: result.substring(0, 300) + (result.length > 300 ? '…' : ''),
    });
  }

  return result;
}

export async function runAgentLoop(
  asset: string,
  emit?: EventEmitter,
): Promise<ThreatVerdict> {
  const llm = getLLMClient();
  const metrics = { calls: 0, sources: new Set<string>() };

  const messages: ConversationMessage[] = [
    {
      role: 'user',
      content: `Analyze whether the crypto asset "${asset}" is currently under any critical threat.
Follow this process:
1. First search to confirm the asset's canonical name and primary news sources.
2. Then run parallel searches for: "${asset} exploit news last 24h", "${asset} SEC enforcement", "${asset} flash loan attack".
3. For any suspicious headlines, scrape the full article to verify. Use browser_scrape for Twitter/X or Reddit links.
4. Return your final JSON verdict.`,
    },
  ];

  let response = await llm.chat(SYSTEM_PROMPT, messages, tools);

  while (response.stopReason === 'tool_use' && response.toolCalls.length > 0) {
    // Emit tool_call events before executing
    for (const call of response.toolCalls) {
      console.log(`[Agent] Calling tool: ${call.name}`, call.input);
      if (emit) {
        emit({ type: 'tool_call', tool: call.name, input: call.input });
      }
    }

    const toolResults = await Promise.all(
      response.toolCalls.map(async (call) => {
        const result = await runTool(call, emit, metrics);
        return { tool_use_id: call.id, content: result };
      }),
    );

    messages.push({
      role: 'assistant',
      toolCalls: response.toolCalls,
      rawContent: response.rawContent,
    });
    messages.push({ role: 'user', toolResults });

    response = await llm.chat(SYSTEM_PROMPT, messages, tools);
  }

  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      asset,
      threatLevel: 'NOMINAL',
      summary: 'Agent completed analysis but returned no structured verdict.',
      evidence: [],
      timestamp: new Date().toISOString(),
      confidenceScore: 0,
      sourcesChecked: Array.from(metrics.sources),
      brightDataCallsUsed: metrics.calls,
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    asset,
    threatLevel: parsed.threatLevel || 'NOMINAL',
    summary: parsed.summary || '',
    evidence: parsed.evidence || [],
    timestamp: new Date().toISOString(),
    confidenceScore: parsed.confidenceScore || 0,
    sourcesChecked: Array.from(metrics.sources),
    brightDataCallsUsed: metrics.calls,
  };
}
