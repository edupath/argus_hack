import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { agent } from '../agent';

const MessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string() });
const ChatSchema = z.object({ 
  mode: z.enum(['counseling', 'application']), 
  messages: z.array(MessageSchema),
  userId: z.string().optional(),
  applicationId: z.string().optional(),
  university: z.string().optional(),
  program: z.string().optional()
});

@Controller('chat')
export class ChatController {
  @Post()
  async chat(@Body() body: unknown) {
    console.log('[CHAT] incoming body', body);
    const { mode, messages, userId, applicationId, university, program } = ChatSchema.parse(body);
    console.log('[CHAT] parsed', { mode, count: messages.length, userId, applicationId, university, program });
    
    const response = await agent(messages as any, mode, university, program, userId);
    console.log('[CHAT] agent response', response);
    
    // Check if application is complete (for application mode)
    let applicationComplete = false;
    if (mode === 'application') {
      // Simple heuristic: if we have at least 5 Q&A pairs, consider it complete
      const qaPairs = messages.filter((m, i) => m.role === 'assistant' && i + 1 < messages.length && messages[i + 1].role === 'user').length;
      applicationComplete = qaPairs >= 5;
    }
    
    return { response, applicationComplete };
  }
}

