import { db } from './config';

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
  role: string;
  profileComplete: boolean;
  profile: {
    personal: {
      fullName: string;
      email: string;
      phone: string;
      country: string;
      dateOfBirth: string;
    };
    academic: {
      currentGPA: string;
      targetDegree: string;
      fieldOfInterest: string;
      educationLevel: string;
      testScores: any[];
    };
    goals: {
      targetDegree: string;
      field: string[];
      timelineMonths: number;
      budgetUSD: number;
      visa: string;
      remoteOk: boolean;
    };
    constraints: {
      budgetUSD: number;
      visa: string;
      remoteOk: boolean;
      location: string[];
    };
    background: {
      education: string[];
      gpaScale: number;
      tests: any[];
      experience: any[];
    };
    preferences: {
      format: string[];
      location: string[];
      duration: string;
    };
    eligibility: {
      meetsMinGpa: boolean;
      meetsLangReq: boolean;
    };
    status: {
      stage: string;
    };
  };
}

export async function createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const userRef = db.collection('users').doc(userId);
    
    const profile: UserProfile = {
      userId,
      email: profileData.email || '',
      fullName: profileData.fullName || '',
      createdAt: profileData.createdAt || new Date().toISOString(),
      role: profileData.role || 'student',
      profileComplete: profileData.profileComplete || false,
      profile: {
        personal: {
          fullName: profileData.profile?.personal?.fullName || '',
          email: profileData.profile?.personal?.email || profileData.email || '',
          phone: profileData.profile?.personal?.phone || '',
          country: profileData.profile?.personal?.country || '',
          dateOfBirth: profileData.profile?.personal?.dateOfBirth || ''
        },
        academic: {
          currentGPA: profileData.profile?.academic?.currentGPA || '',
          targetDegree: profileData.profile?.academic?.targetDegree || '',
          fieldOfInterest: profileData.profile?.academic?.fieldOfInterest || '',
          educationLevel: profileData.profile?.academic?.educationLevel || '',
          testScores: profileData.profile?.academic?.testScores || []
        },
        goals: {
          targetDegree: profileData.profile?.goals?.targetDegree || '',
          field: profileData.profile?.goals?.field || [],
          timelineMonths: profileData.profile?.goals?.timelineMonths || 12,
          budgetUSD: profileData.profile?.goals?.budgetUSD || 0,
          visa: profileData.profile?.goals?.visa || '',
          remoteOk: profileData.profile?.goals?.remoteOk || false
        },
        constraints: {
          budgetUSD: profileData.profile?.constraints?.budgetUSD || 0,
          visa: profileData.profile?.constraints?.visa || '',
          remoteOk: profileData.profile?.constraints?.remoteOk || false,
          location: profileData.profile?.constraints?.location || []
        },
        background: {
          education: profileData.profile?.background?.education || [],
          gpaScale: profileData.profile?.background?.gpaScale || 4.0,
          tests: profileData.profile?.background?.tests || [],
          experience: profileData.profile?.background?.experience || []
        },
        preferences: {
          format: profileData.profile?.preferences?.format || [],
          location: profileData.profile?.preferences?.location || [],
          duration: profileData.profile?.preferences?.duration || ''
        },
        eligibility: {
          meetsMinGpa: profileData.profile?.eligibility?.meetsMinGpa || false,
          meetsLangReq: profileData.profile?.eligibility?.meetsLangReq || false
        },
        status: {
          stage: profileData.profile?.status?.stage || 'explore'
        }
      }
    };

    await userRef.set(profile);
    console.log('[USERS] User profile created:', userId);
    return profile;
  } catch (error) {
    console.error('[USERS] Error creating user profile:', error);
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      console.log('[USERS] User profile not found:', userId);
      return null;
    }
    
    const data = doc.data() as UserProfile;
    console.log('[USERS] User profile retrieved:', userId);
    return data;
  } catch (error) {
    console.error('[USERS] Error getting user profile:', error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const userRef = db.collection('users').doc(userId);
    
    // Get current profile
    const currentProfile = await getUserProfile(userId);
    if (!currentProfile) {
      throw new Error('User profile not found');
    }
    
    // Merge updates with current profile
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      profile: {
        ...currentProfile.profile,
        ...updates.profile
      }
    };
    
    await userRef.update(updatedProfile);
    console.log('[USERS] User profile updated:', userId);
    return updatedProfile;
  } catch (error) {
    console.error('[USERS] Error updating user profile:', error);
    throw error;
  }
}

export async function upsertUserProfile(userId: string, profile: any): Promise<void> {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.set(profile, { merge: true });
    console.log('[USERS] User profile upserted:', userId);
  } catch (error) {
    console.error('[USERS] Error upserting user profile:', error);
    throw error;
  }
}

