import { tool } from 'ai';
import { z } from 'zod';
import fetch from 'node-fetch';

async function searchWeb(query: string): Promise<Array<{ title: string; link: string; snippet: string }>> {
  const cseId = process.env.GOOGLE_CSE_ID;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!cseId || !apiKey) return [];
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}`;
  const resp = await fetch(url as any);
  const data = await resp.json() as any;
  return (data.items || []).map((it: any) => ({ title: it.title, link: it.link, snippet: it.snippet }));
}

export const webSearch = tool({
  description: 'Web search for programs or universities to enrich info',
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const results = await searchWeb(query);
    return JSON.stringify(results.slice(0, 5));
  },
});

