import { db } from './config';

export interface RecentActivity {
  id: string;
  userId: string;
  type: 'profile_update' | 'application_submitted' | 'interview_completed' | 'program_saved';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export async function getRecentActivityByUserId(userId: string): Promise<RecentActivity[]> {
  try {
    const activityRef = db.collection('activity');
    const snapshot = await activityRef.where('userId', '==', userId).orderBy('timestamp', 'desc').limit(10).get();
    
    const activities: RecentActivity[] = [];
    snapshot.forEach(doc => {
      activities.push({ id: doc.id, ...doc.data() } as RecentActivity);
    });
    
    console.log('[ACTIVITY] Retrieved recent activity for user:', userId, activities.length);
    return activities;
  } catch (error: unknown) {
    console.error('[ACTIVITY] Error getting recent activity:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get recent activity: ${message}`);
  }
}

export async function createActivity(activityData: Partial<RecentActivity>): Promise<RecentActivity> {
  try {
    const activityRef = db.collection('activity');
    
    const activity: RecentActivity = {
      id: '',
      userId: activityData.userId || '',
      type: activityData.type || 'profile_update',
      title: activityData.title || '',
      description: activityData.description || '',
      timestamp: activityData.timestamp || new Date().toISOString(),
      metadata: activityData.metadata
    };

    const docRef = await activityRef.add(activity);
    const createdActivity = { ...activity, id: docRef.id };
    
    console.log('[ACTIVITY] Created activity:', docRef.id);
    return createdActivity;
  } catch (error: unknown) {
    console.error('[ACTIVITY] Error creating activity:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to create activity: ${message}`);
  }
}

export async function createProfileUpdateActivity(userId: string, field: string): Promise<void> {
  await createActivity({
    userId,
    type: 'profile_update',
    title: 'Profile Updated',
    description: `Updated ${field} in profile`,
    metadata: { field }
  });
}

export async function createApplicationSubmittedActivity(userId: string, programName: string): Promise<void> {
  await createActivity({
    userId,
    type: 'application_submitted',
    title: 'Application Submitted',
    description: `Submitted application for ${programName}`,
    metadata: { programName }
  });
}

export async function createInterviewCompletedActivity(userId: string, programName: string): Promise<void> {
  await createActivity({
    userId,
    type: 'interview_completed',
    title: 'Interview Completed',
    description: `Completed interview for ${programName}`,
    metadata: { programName }
  });
}

export async function createProgramSavedActivity(userId: string, programName: string): Promise<void> {
  await createActivity({
    userId,
    type: 'program_saved',
    title: 'Program Saved',
    description: `Saved ${programName} to favorites`,
    metadata: { programName }
  });
} 