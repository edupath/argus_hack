import { createOpenAI } from '@ai-sdk/openai';
import { CoreMessage, generateText } from 'ai';
import { allTools } from './tools/manifest';

export async function agent(messages: CoreMessage[], mode: 'counseling' | 'application') {
  const system = `You are an AI admissions counselor. Follow rules:
- Two modes: counseling (generic shortlist) and application (collects profile, transcript, asks up to 5 questions, then staff-only evaluation)
- Never produce student-facing evaluation or statement
- Be concise, professional, ask only necessary clarifying questions
- Use tools as needed, especially programSearch, webSearch, interview, evaluation`;

  console.log('[AGENT] start', { mode, lastMessage: messages[messages.length-1]?.content });
  const openai = createOpenAI({
    apiKey: process.env.openai_api_key || process.env.OPENAI_API_KEY,
    baseURL: process.env.openai_api_base || process.env.OPENAI_BASE_URL,
  });
  const { text } = await generateText({
    model: openai(process.env.openai_model_name || 'gpt-5.0'),
    tools: Object.fromEntries(Object.values(allTools).map(t => [t.id, t.import])),
    maxSteps: 12,
    system,
    prompt: `Mode: ${mode}\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`,
  });
  console.log('[AGENT] done', text);
  return text;
}

