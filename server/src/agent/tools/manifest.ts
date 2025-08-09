import { programSearch } from './program-search.tool';
import { webSearch } from './websearch.tool';
import { interview } from './interview.tool';
import { evaluation } from './evaluation.tool';

export const allTools = {
  'program-search': { id: 'program-search', import: programSearch, description: 'Search and rank programs from catalog' },
  'web-search': { id: 'web-search', import: webSearch, description: 'Enrich program info using web search' },
  'interview': { id: 'interview', import: interview, description: 'Ask targeted questions (max 5) for applications' },
  'evaluation': { id: 'evaluation', import: evaluation, description: 'Produce staff-only evaluation summary' },
};

