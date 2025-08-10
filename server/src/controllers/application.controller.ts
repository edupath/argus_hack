import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { createApplication, getApplicationsByUserId, type Submit } from '../database/applications';
import { evaluation } from '../agent/tools/evaluation.tool';
import { db } from '../database/config';

const SubmitSchema = z.object({
  applicationId: z.string(),
  studentId: z.string(),
  universityId: z.string(),
  profileSnapshot: z.any(),
  transcript: z.any(),
  interviewResponses: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});

@Controller('application')
export class ApplicationController {
  @Get(':studentId')
  async list(@Param('studentId') studentId: string) {
    const items = await getApplicationsByUserId(studentId);
    return { items };
  }

  @Post('submit')
  async submit(@Body() body: unknown) {
    const parsed = SubmitSchema.parse(body) as Submit;
    const payload = JSON.stringify({
      profile: parsed.profileSnapshot,
      transcript: parsed.transcript,
      interviewResponses: parsed.interviewResponses,
    });
    const summary = await evaluation.execute({ payload }, {} as any);
    const verdict = (/\bAdmit\b/i.test(summary) ? 'admit' : /\bReject\b/i.test(summary) ? 'reject' : 'waitlist') as 'admit' | 'reject' | 'waitlist';
    
    // Update existing application with evaluation results
    await db.collection('applications').doc(parsed.applicationId).update({
      status: 'submitted',
      interviewResponses: parsed.interviewResponses,
      evaluation_summary: summary,
      verdict: verdict,
      updatedAt: new Date().toISOString()
    });
    
    return { ok: true, applicationId: parsed.applicationId };
  }
}

