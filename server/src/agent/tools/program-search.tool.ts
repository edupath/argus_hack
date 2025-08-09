import { tool } from 'ai';
import { z } from 'zod';
import programs from '../../data/programs.json';

type Program = {
  id: string;
  university: string;
  name: string;
  field: string[];
  degree: string;
  location: string;
  tuitionUsd: number;
  format: Array<'in-person' | 'online' | 'hybrid'>;
  description: string;
};

function embed(text: string): number[] {
  // Simple bag-of-words hashing to keep it dependency-free; replace with real embeddings if needed
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const vec: Record<string, number> = {};
  for (const t of tokens) vec[t] = (vec[t] || 0) + 1;
  return Object.values(vec);
}

function cosine(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) { dot += (a[i] || 0) * (b[i] || 0); na += (a[i] || 0) ** 2; nb += (b[i] || 0) ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export const programSearch = tool({
  description: `Search, rank, and explain top programs (returns 3-5 results with reasons). Provide a single text query. You MAY include a JSON object inline to guide filtering, e.g. {"target_degree":"Master's","fields":["Data Science"],"budget_usd":30000,"format":["hybrid"]}.`,
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    console.log('[TOOL program-search] query:', query);
    let target_degree = '' as string;
    let fields = [] as string[];
    let budget_usd: number | null = null;
    let remote_ok = false as boolean;
    let location = '' as string;
    let format: Array<'in-person' | 'online' | 'hybrid'> = [];

    // Try to extract inline JSON constraints if present
    const jsonMatch = query.match(/\{[\s\S]*\}$/);
    if (jsonMatch) {
      try {
        const obj = JSON.parse(jsonMatch[0]);
        target_degree = typeof obj.target_degree === 'string' ? obj.target_degree : target_degree;
        fields = Array.isArray(obj.fields) ? obj.fields.filter((x: any) => typeof x === 'string') : fields;
        budget_usd = typeof obj.budget_usd === 'number' ? obj.budget_usd : budget_usd;
        remote_ok = typeof obj.remote_ok === 'boolean' ? obj.remote_ok : remote_ok;
        location = typeof obj.location === 'string' ? obj.location : location;
        format = Array.isArray(obj.format) ? obj.format.filter((x: any) => ['in-person','online','hybrid'].includes(x)).map((x:any)=>x as any) : format;
      } catch {}
    }

    const textOnly = jsonMatch ? query.replace(jsonMatch[0], '').trim() : query;
    const textQuery = [
      textOnly,
      target_degree,
      fields.join(' '),
      format.join(' '),
      location,
      remote_ok ? 'remote' : '',
    ].join(' ');

    const qv = embed(textQuery);
    const scored = (programs as Program[]).map(p => {
      const pv = embed([p.name, p.university, p.field.join(' '), p.description, p.location].join(' '));
      return { p, score: cosine(qv, pv) };
    });
    const filtered = scored.filter(({ p }) => {
      if (typeof budget_usd === 'number' && p.tuitionUsd > budget_usd) return false;
      if (format && format.length) {
        const ok = format.some(f => p.format.includes(f as any));
        if (!ok) return false;
      }
      return true;
    });
    const top = filtered.sort((a,b) => b.score - a.score).slice(0, 5).map(({ p, score }) => ({
      id: p.id,
      name: p.name,
      university: p.university,
      location: p.location,
      tuitionUsd: p.tuitionUsd,
      format: p.format,
      reasons: [
        `Matches query with score ${score.toFixed(2)}`,
        fields.length ? `Aligned to fields: ${fields.join(', ')}` : undefined,
        typeof budget_usd === 'number' ? `Within budget (<= ${budget_usd})` : undefined,
        format.length ? `Preferred format available` : undefined,
        target_degree ? `Degree matches: ${target_degree}` : undefined,
      ].filter(Boolean),
    }));
    return JSON.stringify(top.slice(0, Math.max(3, Math.min(5, top.length))));
  }
});

