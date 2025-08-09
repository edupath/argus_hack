import { db } from './config';

export interface Application {
  id: string;
  studentId: string;
  universityId: string;
  programName: string;
  universityName: string;
  status: 'draft' | 'submitted' | 'in_progress' | 'reviewed' | 'accepted' | 'rejected';
  deadline: string;
  createdAt: string;
  updatedAt: string;
  profileSnapshot?: any;
  transcript?: any;
  interviewResponses?: { question: string; answer: string; }[];
  evaluationSummary?: string;
  verdict?: 'admit' | 'waitlist' | 'reject';
}

export async function getApplicationsByUserId(userId: string): Promise<Application[]> {
  try {
    const applicationsRef = db.collection('applications');
    const snapshot = await applicationsRef.where('studentId', '==', userId).orderBy('createdAt', 'desc').get();
    
    const applications: Application[] = [];
    snapshot.forEach(doc => {
      applications.push({ id: doc.id, ...doc.data() } as Application);
    });
    
    console.log('[APPLICATIONS] Retrieved applications for user:', userId, applications.length);
    return applications;
  } catch (error) {
    console.error('[APPLICATIONS] Error getting applications:', error);
    throw error;
  }
}

export async function createApplication(applicationData: Partial<Application>): Promise<Application> {
  try {
    const applicationsRef = db.collection('applications');
    
    const application: Application = {
      id: '',
      studentId: applicationData.studentId || '',
      universityId: applicationData.universityId || '',
      programName: applicationData.programName || '',
      universityName: applicationData.universityName || '',
      status: applicationData.status || 'draft',
      deadline: applicationData.deadline || '',
      createdAt: applicationData.createdAt || new Date().toISOString(),
      updatedAt: applicationData.updatedAt || new Date().toISOString(),
      profileSnapshot: applicationData.profileSnapshot,
      transcript: applicationData.transcript,
      interviewResponses: applicationData.interviewResponses || [],
      evaluationSummary: applicationData.evaluationSummary,
      verdict: applicationData.verdict
    };

    const docRef = await applicationsRef.add(application);
    const createdApplication = { ...application, id: docRef.id };
    
    console.log('[APPLICATIONS] Created application:', docRef.id);
    return createdApplication;
  } catch (error) {
    console.error('[APPLICATIONS] Error creating application:', error);
    throw error;
  }
}

export async function updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
  try {
    const applicationRef = db.collection('applications').doc(id);
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await applicationRef.update(updateData);
    
    const doc = await applicationRef.get();
    const updatedApplication = { id: doc.id, ...doc.data() } as Application;
    
    console.log('[APPLICATIONS] Updated application:', id);
    return updatedApplication;
  } catch (error) {
    console.error('[APPLICATIONS] Error updating application:', error);
    throw error;
  }
}

export async function deleteApplication(id: string): Promise<void> {
  try {
    const applicationRef = db.collection('applications').doc(id);
    await applicationRef.delete();
    
    console.log('[APPLICATIONS] Deleted application:', id);
  } catch (error) {
    console.error('[APPLICATIONS] Error deleting application:', error);
    throw error;
  }
}

export async function submitApplication(id: string, profileSnapshot: any, transcript: any, interviewResponses: { question: string; answer: string; }[]): Promise<Application> {
  try {
    const applicationRef = db.collection('applications').doc(id);
    
    const updateData = {
      status: 'submitted',
      profileSnapshot,
      transcript,
      interviewResponses,
      updatedAt: new Date().toISOString()
    };
    
    await applicationRef.update(updateData);
    
    const doc = await applicationRef.get();
    const updatedApplication = { id: doc.id, ...doc.data() } as Application;
    
    console.log('[APPLICATIONS] Submitted application:', id);
    return updatedApplication;
  } catch (error) {
    console.error('[APPLICATIONS] Error submitting application:', error);
    throw error;
  }
}

export type Submit = {
  studentId: string;
  universityId: string;
  profileSnapshot: any;
  transcript: any;
  interviewResponses: { question: string; answer: string; }[];
};

