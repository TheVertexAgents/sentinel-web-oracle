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

  const body = JSON.parse(response.data.body);
  return (body.organic || []).slice(0, 5).map((r: any) => ({
    title: r.title,
    url: r.url,
    description: r.description || '',
  }));
}
