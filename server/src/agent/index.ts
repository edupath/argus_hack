import { CoreMessage } from 'ai';
import { counselingAgent } from './counseling-agent';
import { applicationAgent } from './application-agent';

export async function agent(messages: CoreMessage[], mode: 'counseling' | 'application', university?: string, program?: string, userId?: string) {
  console.log('[AGENT] routing to specialized agent', { mode, university, program, userId });
  
  if (mode === 'counseling') {
    return await counselingAgent(messages);
  } else if (mode === 'application') {
    return await applicationAgent(messages, university, program, userId);
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
}

