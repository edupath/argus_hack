import { tool } from 'ai';
import { z } from 'zod';

export const evaluation = tool({
  description: 'Generate staff-facing evaluation summary. Never student-facing.',
  parameters: z.object({
    payload: z.string(),
  }),
  execute: async ({ payload }) => {
    let p: any = {};
    let t: any = {};
    let interviewResponses: Array<{ question: string; answer: string }> = [];
    try {
      const obj = JSON.parse(payload || '{}');
      p = obj.profile ?? {};
      t = obj.transcript ?? {};
      interviewResponses = Array.isArray(obj.interviewResponses) ? obj.interviewResponses : [];
    } catch {}
    const strengths: string[] = [];
    const risks: string[] = [];
    const personal: string[] = [];
    const special: string[] = [];

    if (Array.isArray(t?.courses) && Array.isArray(t?.grades)) {
      t.courses.forEach((c: string, i: number) => {
        const g = t.grades[i];
        if (g >= 3.7) strengths.push(`${c} (${g})`);
        else if (g <= 3.0) risks.push(`${c} (${g})`);
      });
    }
    if (t?.trend === 'improving') strengths.push('Improving GPA trend');
    if (t?.trend === 'declining') risks.push('Declining GPA trend');

    interviewResponses.forEach(({ question, answer }) => {
      if (/tutor|study|improv/i.test(answer)) personal.push('Demonstrated proactive improvement efforts');
      if (/language|english/i.test(answer)) risks.push('Language proficiency may need support');
      if (/family|work|responsib/i.test(answer)) special.push('Family/work responsibilities impacted activities');
    });

    const verdict = strengths.length > risks.length + 1 ? 'Admit' : (risks.length > strengths.length + 1 ? 'Reject' : 'Waitlist');

    const summary = [
      '=== Academic Strengths ===',
      strengths.length ? strengths.join('; ') : 'None highlighted',
      '',
      '=== Academic Weaknesses / Risk Areas ===',
      risks.length ? risks.join('; ') : 'None highlighted',
      '',
      '=== Personal Qualities / Motivation ===',
      personal.length ? personal.join('; ') : 'Neutral/insufficient evidence',
      '',
      '=== Special Circumstances ===',
      special.length ? special.join('; ') : 'None reported',
      '',
      '=== Overall Recommendation ===',
      `${verdict} – Based on transcript patterns and interview context.`,
    ].join('\n');

    return summary;
  }
});

