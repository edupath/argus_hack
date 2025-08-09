export type UserProfile = {
  identity: { name: string; email: string; country?: string };
  goals?: { target_degree?: string; field?: string[]; timeline_months?: number };
  constraints?: { budget_usd?: number; visa?: string; remote_ok?: boolean };
  background?: { education?: string[]; gpa_scale?: number; tests?: string[]; experience?: string[] };
  preferences?: { format?: Array<'in-person' | 'online' | 'hybrid'> };
  eligibility?: { meets_min_gpa?: boolean; meets_lang_req?: boolean };
  status?: { stage?: 'explore' | 'apply' };
};

export type Transcript = { courses: string[]; grades: number[]; trend?: 'improving' | 'stable' | 'declining'; englishLower?: boolean };

export type InterviewQA = { question: string; answer: string };

export type ApplicationRecord = {
  student_id: string;
  university_id: string;
  profile_snapshot: UserProfile;
  transcript: Transcript;
  interview_responses: InterviewQA[];
  evaluation_summary?: string;
  verdict?: 'admit' | 'waitlist' | 'reject';
  created_at: string;
};

