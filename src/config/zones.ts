import dotenv from 'dotenv';
dotenv.config();

const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();

// Default model per provider
const defaultModel =
  provider === 'anthropic' ? 'claude-sonnet-4-6' : 'llama-3.3-70b-versatile';

export const config = {
  brightdata: {
    apiKey: process.env.BRIGHTDATA_API_KEY!,
    baseUrl: 'https://api.brightdata.com/request',
    serpZone: process.env.SERP_ZONE || 'serp_api1',
    unlockerZone: process.env.UNLOCKER_ZONE || 'web_unlocker1',
    browserZone: process.env.BROWSER_ZONE || 'scraping_browser1',
  },
  llm: {
    provider,
    model: process.env.AI_MODEL || defaultModel,
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    aimlKey: process.env.AIML_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3008', 10),
  },
};
