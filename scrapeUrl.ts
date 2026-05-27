import axios from 'axios';
import { config } from '../config/zones';

export async function scrapeUrl(url: string): Promise<string> {
  const response = await axios.post(
    config.brightdata.baseUrl,
    {
      zone: config.brightdata.unlockerZone,
      url,
      format: 'raw',
    },
    {
      headers: { Authorization: `Bearer ${config.brightdata.apiKey}` },
    }
  );

  // Strip scripts and HTML tags, return first 5000 chars
  return response.data
    .replace(/<script[^>]*>.*?<\/script>/gs, '')
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000);
}
