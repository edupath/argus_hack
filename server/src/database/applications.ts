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
  chatHistory?: any[];
  isActive?: boolean;
  interviewResponses?: Array<{ question: string; answer: string }>;
}

// Type for creating new applications
export type CreateApplicationData = Omit<Application, 'id'>;

// Type for submitting applications with evaluation data
export type Submit = {
  applicationId: string;
  studentId: string;
  universityId: string;
  profileSnapshot: any;
  transcript: any;
  interviewResponses: Array<{ question: string; answer: string }>;
};

export async function getApplicationsByUserId(userId: string): Promise<Application[]> {
  try {
    const applicationsRef = db.collection('applications');
    const snapshot = await applicationsRef.where('studentId', '==', userId).get();
    
    const applications: Application[] = [];
    snapshot.forEach(doc => {
      applications.push({ id: doc.id, ...doc.data() } as Application);
    });
    
    // Sort by createdAt in memory instead of in the query
    applications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('[APPLICATIONS] Retrieved applications for user:', userId, applications.length);
    return applications;
  } catch (error) {
    console.error('[APPLICATIONS] Error getting applications:', error);
    throw error;
  }
}

export async function createApplication(applicationData: CreateApplicationData): Promise<Application> {
  try {
    const applicationsRef = db.collection('applications');
    
    const application: Application = {
      id: '',
      studentId: applicationData.studentId,
      universityId: applicationData.universityId,
      programName: applicationData.programName,
      universityName: applicationData.universityName,
      status: applicationData.status || 'draft',
      deadline: applicationData.deadline,
      createdAt: applicationData.createdAt || new Date().toISOString(),
      updatedAt: applicationData.updatedAt || new Date().toISOString(),
      chatHistory: applicationData.chatHistory || [],
      isActive: applicationData.isActive !== undefined ? applicationData.isActive : true
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



