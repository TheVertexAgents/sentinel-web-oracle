import axios from 'axios';
import { config } from '../config/zones';

/**
 * Scrapes a URL using Bright Data Scraping Browser zone.
 * Useful for JavaScript-heavy pages that Web Unlocker can't fully render.
 */
export async function browserScrape(url: string): Promise<string> {
  const response = await axios.post(
    config.brightdata.baseUrl,
    {
      zone: config.brightdata.browserZone,
      url,
      format: 'raw',
    },
    {
      headers: { Authorization: `Bearer ${config.brightdata.apiKey}` },
    }
  );

  return response.data
    .replace(/<script[^>]*>.*?<\/script>/gs, '')
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000);
}
