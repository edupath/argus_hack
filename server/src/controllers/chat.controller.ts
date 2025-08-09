import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { agent } from '../agent';

const MessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string() });
const ChatSchema = z.object({ mode: z.enum(['counseling', 'application']), messages: z.array(MessageSchema) });

@Controller('chat')
export class ChatController {
  @Post()
  async chat(@Body() body: unknown) {
    console.log('[CHAT] incoming body', body);
    const { mode, messages } = ChatSchema.parse(body);
    console.log('[CHAT] parsed', { mode, count: messages.length });
    const response = await agent(messages as any, mode);
    console.log('[CHAT] agent response', response);
    return { response };
  }
}

