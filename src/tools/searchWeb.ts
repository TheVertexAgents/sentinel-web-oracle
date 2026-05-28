import axios from 'axios';
import { config } from '../config/zones';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:h`;

  const response = await axios.post(
    config.brightdata.baseUrl,
    {
      zone: config.brightdata.serpZone,
      url: searchUrl,
      format: 'json',
    },
    {
      headers: { Authorization: `Bearer ${config.brightdata.apiKey}` },
    }
  );

  // Bright Data SERP API returns parsed JSON directly as response.data
  // organic results use 'link' field (not 'url')
  const body = typeof response.data === 'string'
    ? JSON.parse(response.data)
    : response.data;

  return (body.organic || []).slice(0, 5).map((r: any) => ({
    title: r.title || '',
    url: r.link || r.url || '',
    description: r.description || r.snippet || '',
  }));
}
