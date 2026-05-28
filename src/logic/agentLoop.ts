import { searchWeb, SearchResult } from '../tools/searchWeb';
import { scrapeUrl } from '../tools/scrapeUrl';
import { getLLMClient } from './llm/factory';
import type { ToolDefinition, ConversationMessage, ToolCall } from './llm/types';

export interface ThreatVerdict {
  asset: string;
  threatLevel: 'CRITICAL' | 'ELEVATED' | 'NOMINAL';
  summary: string;
  evidence: { title: string; url: string }[];
  timestamp: string;
}

const SYSTEM_PROMPT = `You are Sentinel Web Oracle, a conservative crypto threat intelligence agent.
Your job is to detect genuine security threats or regulatory actions against crypto assets.
Be extremely conservative: a false positive (calling CRITICAL when there is no threat) is BETTER than missing a real attack.
Only call CRITICAL if you have confirmed evidence from at least one scraped article that describes:
- A technical exploit, hack, or flash loan attack with specific dollar amounts or transaction hashes
- An official SEC/regulatory cease-and-desist or enforcement action
All evidence must be timestamped within the last 4 hours.
Always return a JSON object with: threatLevel, summary, evidence (array of {title, url}).`;

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
    description: 'Scrape the full text of an article URL using Bright Data Web Unlocker.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to scrape' },
      },
      required: ['url'],
    },
  },
];

async function runTool(call: ToolCall): Promise<string> {
  if (call.name === 'search_web') {
    const results: SearchResult[] = await searchWeb(call.input.query as string);
    return JSON.stringify(results);
  }
  if (call.name === 'scrape_url') {
    return scrapeUrl(call.input.url as string);
  }
  return 'Unknown tool';
}

export async function runAgentLoop(asset: string): Promise<ThreatVerdict> {
  const llm = getLLMClient();

  const messages: ConversationMessage[] = [
    {
      role: 'user',
      content: `Analyze whether the crypto asset "${asset}" is currently under any critical threat.
Follow this process:
1. First search to confirm the asset's canonical name and primary news sources.
2. Then run parallel searches for: "${asset} exploit news last 24h", "${asset} SEC enforcement", "${asset} flash loan attack".
3. For any suspicious headlines, scrape the full article to verify.
4. Return your final JSON verdict.`,
    },
  ];

  let response = await llm.chat(SYSTEM_PROMPT, messages, tools);

  // Agentic loop — keep running until the model stops requesting tools
  while (response.stopReason === 'tool_use' && response.toolCalls.length > 0) {
    const toolResults = await Promise.all(
      response.toolCalls.map(async (call) => {
        console.log(`[Agent] Calling tool: ${call.name}`, call.input);
        const result = await runTool(call);
        return { tool_use_id: call.id, content: result };
      }),
    );

    // Append assistant turn (with tool calls) and tool results
    messages.push({
      role: 'assistant',
      toolCalls: response.toolCalls,
      rawContent: response.rawContent,
    });
    messages.push({ role: 'user', toolResults });

    response = await llm.chat(SYSTEM_PROMPT, messages, tools);
  }

  // Extract final JSON verdict from the last text response
  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      asset,
      threatLevel: 'NOMINAL',
      summary: 'Agent completed analysis but returned no structured verdict.',
      evidence: [],
      timestamp: new Date().toISOString(),
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    asset,
    threatLevel: parsed.threatLevel || 'NOMINAL',
    summary: parsed.summary || '',
    evidence: parsed.evidence || [],
    timestamp: new Date().toISOString(),
  };
}
