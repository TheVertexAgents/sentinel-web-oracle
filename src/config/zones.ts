import dotenv from 'dotenv';
dotenv.config();

export const config = {
  brightdata: {
    apiKey: process.env.BRIGHTDATA_API_KEY!,
    baseUrl: 'https://api.brightdata.com/request',
    serpZone: process.env.SERP_ZONE || 'serp_api1',
    unlockerZone: process.env.UNLOCKER_ZONE || 'web_unlocker1',
    browserZone: process.env.BROWSER_ZONE || 'scraping_browser1',
  },
  llm: {
    anthropicKey: process.env.ANTHROPIC_API_KEY!,
  },
  server: {
    port: parseInt(process.env.PORT || '3008', 10),
  },
};
