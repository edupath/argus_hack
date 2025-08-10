import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { agent } from '../agent';

const MessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string() });
const ChatSchema = z.object({ 
  mode: z.enum(['counseling', 'application']), 
  messages: z.array(MessageSchema),
  applicationId: z.string().optional(),
  university: z.string().optional(),
  program: z.string().optional()
});

@Controller('chat')
export class ChatController {
  @Post()
  async chat(@Body() body: unknown) {
    console.log('[CHAT] incoming body', body);
    const { mode, messages, applicationId, university, program } = ChatSchema.parse(body);
    console.log('[CHAT] parsed', { mode, count: messages.length, applicationId, university, program });
    
    // Add context for application mode
    let enhancedMessages = messages;
    if (mode === 'application' && university && program) {
      enhancedMessages = [
        { role: 'system' as any, content: `You are helping the student apply to ${program} at ${university}. Collect their information systematically and ask relevant questions.` },
        ...messages
      ];
    }
    
    const response = await agent(enhancedMessages as any, mode);
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

