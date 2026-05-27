import Anthropic from '@anthropic-ai/sdk';
import { searchWeb, SearchResult } from '../tools/searchWeb';
import { scrapeUrl } from '../tools/scrapeUrl';
import { config } from '../config/zones';

const client = new Anthropic({ apiKey: config.llm.anthropicKey });

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

const tools: Anthropic.Tool[] = [
  {
    name: 'search_web',
    description: 'Search the web for recent news about a crypto asset using Bright Data SERP API.',
    input_schema: {
      type: 'object' as const,
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
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The URL to scrape' },
      },
      required: ['url'],
    },
  },
];

async function runTool(name: string, input: any): Promise<string> {
  if (name === 'search_web') {
    const results: SearchResult[] = await searchWeb(input.query);
    return JSON.stringify(results);
  }
  if (name === 'scrape_url') {
    const text = await scrapeUrl(input.url);
    return text;
  }
  return 'Unknown tool';
}

export async function runAgentLoop(asset: string): Promise<ThreatVerdict> {
  const messages: Anthropic.MessageParam[] = [
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

  let response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  // Agentic loop — keep running until stop_reason is 'end_turn'
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      if (block.type !== 'tool_use') continue;
      console.log(`[Agent] Calling tool: ${block.name}`, block.input);
      const result = await runTool(block.name, block.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  // Extract final JSON verdict from last text block
  const finalText = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('');

  const jsonMatch = finalText.match(/\{[\s\S]*\}/);
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
