import { tool } from 'ai';
import { z } from 'zod';

export const interview = tool({
  description: 'Generate up to 5 targeted interview questions based on GPA, transcript, and profile completeness. Ask one at a time.',
  parameters: z.object({
    payload: z.string(),
  }),
  execute: async ({ payload }) => {
    let askedCount = 0;
    let lastAnswer = '';
    let p: any = {};
    let t: any = {};
    try {
      const obj = JSON.parse(payload || '{}');
      askedCount = typeof obj.askedCount === 'number' ? obj.askedCount : 0;
      lastAnswer = typeof obj.lastAnswer === 'string' ? obj.lastAnswer : '';
      p = obj.profile ?? {};
      t = obj.transcript ?? {};
    } catch {}
    console.log('[TOOL interview] args', { askedCount, hasProfile: !!p, hasTranscript: !!t, lastAnswer });
    if (askedCount >= 5) return JSON.stringify({ done: true });
    const gaps: string[] = [];
    if (!p?.goals?.field?.length) gaps.push('Preferred field of study');
    if (!p?.constraints?.budget_usd) gaps.push('Budget constraints');
    if (!t?.trend) gaps.push('Grade trend context');
    const questions: string[] = [];
    if (t?.trend === 'improving') questions.push('Your GPA improved recently. What drove that change?');
    if (t?.englishLower) questions.push('English appears lower than STEM. What challenges did you face?');
    if (!p?.experience?.length) questions.push('Were you involved in work, family responsibilities, or projects outside school?');
    while (questions.length && questions.length + askedCount > 5) questions.pop();
    const q = (questions[0] || gaps[0] || 'Is there any context the admissions team should know about your academic journey?');
    return JSON.stringify({ done: false, question: q });
  }
});

