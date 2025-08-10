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
      firstName: string;
      middleName: string;
      lastName: string;
      dateOfBirth: string;
      email: string;
      phone: string;
      mailingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
      gender: string;
      pronouns: string;
      birthCountry: string;
      citizenshipStatus: string;
    };
    academic: {
      currentGPA: string;
      gpaScale: number;
      targetDegree: string;
      fieldOfInterest: string;
      educationLevel: string;
      testScores: {
        sat: {
          total: number;
          math: number;
          reading: number;
          writing: number;
        };
        act: {
          composite: number;
          math: number;
          english: number;
          reading: number;
          science: number;
        };
        toefl: number;
        ielts: number;
        gre: {
          verbal: number;
          quantitative: number;
          analytical: number;
        };
        gmat: number;
      };
      transcript: {
        fileUrl: string;
        fileName: string;
        uploadedAt: string;
      };
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
          firstName: profileData.profile?.personal?.firstName || '',
          middleName: profileData.profile?.personal?.middleName || '',
          lastName: profileData.profile?.personal?.lastName || '',
          dateOfBirth: profileData.profile?.personal?.dateOfBirth || '',
          email: profileData.profile?.personal?.email || profileData.email || '',
          phone: profileData.profile?.personal?.phone || '',
          mailingAddress: {
            street: profileData.profile?.personal?.mailingAddress?.street || '',
            city: profileData.profile?.personal?.mailingAddress?.city || '',
            state: profileData.profile?.personal?.mailingAddress?.state || '',
            zipCode: profileData.profile?.personal?.mailingAddress?.zipCode || '',
            country: profileData.profile?.personal?.mailingAddress?.country || ''
          },
          gender: profileData.profile?.personal?.gender || '',
          pronouns: profileData.profile?.personal?.pronouns || '',
          birthCountry: profileData.profile?.personal?.birthCountry || '',
          citizenshipStatus: profileData.profile?.personal?.citizenshipStatus || ''
        },
        academic: {
          currentGPA: profileData.profile?.academic?.currentGPA || '',
          gpaScale: profileData.profile?.academic?.gpaScale || 4.0,
          targetDegree: profileData.profile?.academic?.targetDegree || '',
          fieldOfInterest: profileData.profile?.academic?.fieldOfInterest || '',
          educationLevel: profileData.profile?.academic?.educationLevel || '',
          testScores: {
            sat: {
              total: profileData.profile?.academic?.testScores?.sat?.total || 0,
              math: profileData.profile?.academic?.testScores?.sat?.math || 0,
              reading: profileData.profile?.academic?.testScores?.sat?.reading || 0,
              writing: profileData.profile?.academic?.testScores?.sat?.writing || 0
            },
            act: {
              composite: profileData.profile?.academic?.testScores?.act?.composite || 0,
              math: profileData.profile?.academic?.testScores?.act?.math || 0,
              english: profileData.profile?.academic?.testScores?.act?.english || 0,
              reading: profileData.profile?.academic?.testScores?.act?.reading || 0,
              science: profileData.profile?.academic?.testScores?.act?.science || 0
            },
            toefl: profileData.profile?.academic?.testScores?.toefl || 0,
            ielts: profileData.profile?.academic?.testScores?.ielts || 0,
            gre: {
              verbal: profileData.profile?.academic?.testScores?.gre?.verbal || 0,
              quantitative: profileData.profile?.academic?.testScores?.gre?.quantitative || 0,
              analytical: profileData.profile?.academic?.testScores?.gre?.analytical || 0
            },
            gmat: profileData.profile?.academic?.testScores?.gmat || 0
          },
          transcript: {
            fileUrl: profileData.profile?.academic?.transcript?.fileUrl || '',
            fileName: profileData.profile?.academic?.transcript?.fileName || '',
            uploadedAt: profileData.profile?.academic?.transcript?.uploadedAt || ''
          }
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
  } catch (error: unknown) {
    console.error('[USERS] Error creating user profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to create user profile: ${message}`);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('[DEBUG] getUserProfile called with userId:', userId);
    
    const userRef = db.collection('users').doc(userId);
    console.log('[DEBUG] Firestore path:', userRef.path);
    
    const doc = await userRef.get();
    console.log('[DEBUG] Document exists:', doc.exists);
    
    if (!doc.exists) {
      console.log('[USERS] User profile not found:', userId);
      return null;
    }
    
    const data = doc.data();
    console.log('[DEBUG] Raw Firestore data:', JSON.stringify(data, null, 2));
    
    // Check specific fields we're interested in
    console.log('[DEBUG] testScores field type:', typeof data?.profile?.academic?.testScores);
    console.log('[DEBUG] testScores value:', JSON.stringify(data?.profile?.academic?.testScores, null, 2));
    console.log('[DEBUG] gpaScale field:', data?.profile?.academic?.gpaScale);
    console.log('[DEBUG] firstName field:', data?.profile?.personal?.firstName);
    
    console.log('[USERS] User profile retrieved:', userId);
    
    // Migrate old profile structure to new structure
    const migratedData = migrateProfileStructure(data);
    console.log('[USERS] Migrated profile data:', JSON.stringify(migratedData, null, 2));
    
    // Check migrated testScores specifically
    console.log('[DEBUG] Migrated testScores:', JSON.stringify(migratedData.profile.academic.testScores, null, 2));
    
    return migratedData as UserProfile;
  } catch (error: unknown) {
    console.error('[USERS] Error getting user profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get user profile: ${message}`);
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
  } catch (error: unknown) {
    console.error('[USERS] Error updating user profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to update user profile: ${message}`);
  }
}

export async function upsertUserProfile(userId: string, profile: any): Promise<void> {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.set(profile, { merge: true });
    console.log('[USERS] User profile upserted:', userId);
  } catch (error: unknown) {
    console.error('[USERS] Error upserting user profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to upsert user profile: ${message}`);
  }
}

// Migration function to handle old profile structures
function migrateProfileStructure(data: any): UserProfile {
  console.log('[DEBUG] migrateProfileStructure called with data:', JSON.stringify(data, null, 2));
  console.log('[USERS] Migrating profile structure for user:', data.userId);
  
  // Check if it's already the new structure
  const hasNewStructure = data.profile?.personal?.firstName !== undefined;
  console.log('[DEBUG] Has new structure (firstName exists):', hasNewStructure);
  console.log('[DEBUG] firstName value:', data.profile?.personal?.firstName);
  
  // If it's already the new structure, ensure all fields are present
  if (hasNewStructure) {
    console.log('[USERS] Profile has new structure, ensuring all fields are present');
    console.log('[USERS] Current testScores:', JSON.stringify(data.profile?.academic?.testScores, null, 2));
    return ensureCompleteProfileStructure(data) as UserProfile;
  }
  
  // Migrate from old structure
  const migratedProfile: UserProfile = {
    userId: data.userId || '',
    email: data.email || '',
    fullName: data.fullName || '',
    createdAt: data.createdAt || new Date().toISOString(),
    role: data.role || 'student',
    profileComplete: data.profileComplete || false,
    profile: {
      personal: {
        firstName: data.profile?.personal?.fullName?.split(' ')[0] || '',
        middleName: data.profile?.personal?.fullName?.split(' ')[1] || '',
        lastName: data.profile?.personal?.fullName?.split(' ').slice(2).join(' ') || '',
        dateOfBirth: data.profile?.personal?.dateOfBirth || '',
        email: data.profile?.personal?.email || data.email || '',
        phone: data.profile?.personal?.phone || '',
        mailingAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: data.profile?.personal?.country || ''
        },
        gender: '',
        pronouns: '',
        birthCountry: '',
        citizenshipStatus: ''
      },
      academic: {
        currentGPA: data.profile?.academic?.currentGPA || '',
        gpaScale: data.profile?.academic?.gpaScale || 4.0,
        targetDegree: data.profile?.academic?.targetDegree || '',
        fieldOfInterest: data.profile?.academic?.fieldOfInterest || '',
        educationLevel: data.profile?.academic?.educationLevel || '',
        testScores: {
          sat: { 
            total: data.profile?.academic?.testScores?.sat?.total || 0, 
            math: data.profile?.academic?.testScores?.sat?.math || 0, 
            reading: data.profile?.academic?.testScores?.sat?.reading || 0, 
            writing: data.profile?.academic?.testScores?.sat?.writing || 0 
          },
          act: { 
            composite: data.profile?.academic?.testScores?.act?.composite || 0, 
            math: data.profile?.academic?.testScores?.act?.math || 0, 
            english: data.profile?.academic?.testScores?.act?.english || 0, 
            reading: data.profile?.academic?.testScores?.act?.reading || 0, 
            science: data.profile?.academic?.testScores?.act?.science || 0 
          },
          toefl: data.profile?.academic?.testScores?.toefl || 0,
          ielts: data.profile?.academic?.testScores?.ielts || 0,
          gre: { 
            verbal: data.profile?.academic?.testScores?.gre?.verbal || 0, 
            quantitative: data.profile?.academic?.testScores?.gre?.quantitative || 0, 
            analytical: data.profile?.academic?.testScores?.gre?.analytical || 0 
          },
          gmat: data.profile?.academic?.testScores?.gmat || 0
        },
        transcript: {
          fileUrl: '',
          fileName: '',
          uploadedAt: ''
        }
      },
      goals: {
        targetDegree: data.profile?.goals?.targetDegree || '',
        field: data.profile?.goals?.field || [],
        timelineMonths: data.profile?.goals?.timelineMonths || 12,
        budgetUSD: data.profile?.goals?.budgetUSD || 0,
        visa: data.profile?.goals?.visa || '',
        remoteOk: data.profile?.goals?.remoteOk || false
      },
      constraints: {
        budgetUSD: data.profile?.constraints?.budgetUSD || 0,
        visa: data.profile?.constraints?.visa || '',
        remoteOk: data.profile?.constraints?.remoteOk || false,
        location: data.profile?.constraints?.location || []
      },
      background: {
        education: data.profile?.background?.education || [],
        experience: data.profile?.background?.experience || []
      },
      preferences: {
        format: data.profile?.preferences?.format || [],
        location: data.profile?.preferences?.location || [],
        duration: data.profile?.preferences?.duration || ''
      },
      eligibility: {
        meetsMinGpa: data.profile?.eligibility?.meetsMinGpa || false,
        meetsLangReq: data.profile?.eligibility?.meetsLangReq || false
      },
      status: {
        stage: data.profile?.status?.stage || 'explore'
      }
    }
  };
  
  console.log('[USERS] Profile migration completed');
  return migratedProfile;
}

// Function to ensure all fields are present in new structure profiles
function ensureCompleteProfileStructure(data: any): UserProfile {
  console.log('[DEBUG] ensureCompleteProfileStructure called');
  console.log('[USERS] Ensuring complete profile structure for user:', data.userId);
  console.log('[USERS] Input testScores:', JSON.stringify(data.profile?.academic?.testScores, null, 2));
  console.log('[DEBUG] Input testScores type:', typeof data.profile?.academic?.testScores);
  console.log('[DEBUG] Input testScores is array:', Array.isArray(data.profile?.academic?.testScores));
  
  const result = {
    userId: data.userId || '',
    email: data.email || '',
    fullName: data.fullName || '',
    createdAt: data.createdAt || new Date().toISOString(),
    role: data.role || 'student',
    profileComplete: data.profileComplete || false,
    profile: {
      personal: {
        firstName: data.profile?.personal?.firstName || '',
        middleName: data.profile?.personal?.middleName || '',
        lastName: data.profile?.personal?.lastName || '',
        dateOfBirth: data.profile?.personal?.dateOfBirth || '',
        email: data.profile?.personal?.email || data.email || '',
        phone: data.profile?.personal?.phone || '',
        mailingAddress: {
          street: data.profile?.personal?.mailingAddress?.street || '',
          city: data.profile?.personal?.mailingAddress?.city || '',
          state: data.profile?.personal?.mailingAddress?.state || '',
          zipCode: data.profile?.personal?.mailingAddress?.zipCode || '',
          country: data.profile?.personal?.mailingAddress?.country || ''
        },
        gender: data.profile?.personal?.gender || '',
        pronouns: data.profile?.personal?.pronouns || '',
        birthCountry: data.profile?.personal?.birthCountry || '',
        citizenshipStatus: data.profile?.personal?.citizenshipStatus || ''
      },
      academic: {
        currentGPA: data.profile?.academic?.currentGPA || '',
        gpaScale: data.profile?.academic?.gpaScale || 4.0,
        targetDegree: data.profile?.academic?.targetDegree || '',
        fieldOfInterest: data.profile?.academic?.fieldOfInterest || '',
        educationLevel: data.profile?.academic?.educationLevel || '',
        testScores: {
          sat: { 
            total: data.profile?.academic?.testScores?.sat?.total || 0, 
            math: data.profile?.academic?.testScores?.sat?.math || 0, 
            reading: data.profile?.academic?.testScores?.sat?.reading || 0, 
            writing: data.profile?.academic?.testScores?.sat?.writing || 0 
          },
          act: { 
            composite: data.profile?.academic?.testScores?.act?.composite || 0, 
            math: data.profile?.academic?.testScores?.act?.math || 0, 
            english: data.profile?.academic?.testScores?.act?.english || 0, 
            reading: data.profile?.academic?.testScores?.act?.reading || 0, 
            science: data.profile?.academic?.testScores?.act?.science || 0 
          },
          toefl: data.profile?.academic?.testScores?.toefl || 0,
          ielts: data.profile?.academic?.testScores?.ielts || 0,
          gre: { 
            verbal: data.profile?.academic?.testScores?.gre?.verbal || 0, 
            quantitative: data.profile?.academic?.testScores?.gre?.quantitative || 0, 
            analytical: data.profile?.academic?.testScores?.gre?.analytical || 0 
          },
          gmat: data.profile?.academic?.testScores?.gmat || 0
        },
        transcript: {
          fileUrl: data.profile?.academic?.transcript?.fileUrl || '',
          fileName: data.profile?.academic?.transcript?.fileName || '',
          uploadedAt: data.profile?.academic?.transcript?.uploadedAt || ''
        }
      },
      goals: {
        targetDegree: data.profile?.goals?.targetDegree || '',
        field: data.profile?.goals?.field || [],
        timelineMonths: data.profile?.goals?.timelineMonths || 12,
        budgetUSD: data.profile?.goals?.budgetUSD || 0,
        visa: data.profile?.goals?.visa || '',
        remoteOk: data.profile?.goals?.remoteOk || false
      },
      constraints: {
        budgetUSD: data.profile?.constraints?.budgetUSD || 0,
        visa: data.profile?.constraints?.visa || '',
        remoteOk: data.profile?.constraints?.remoteOk || false,
        location: data.profile?.constraints?.location || []
      },
      background: {
        education: data.profile?.background?.education || [],
        experience: data.profile?.background?.experience || []
      },
      preferences: {
        format: data.profile?.preferences?.format || [],
        location: data.profile?.preferences?.location || [],
        duration: data.profile?.preferences?.duration || ''
      },
      eligibility: {
        meetsMinGpa: data.profile?.eligibility?.meetsMinGpa || false,
        meetsLangReq: data.profile?.eligibility?.meetsLangReq || false
      },
      status: {
        stage: data.profile?.status?.stage || 'explore'
      }
    }
  };
  
  console.log('[USERS] Final testScores structure:', JSON.stringify(result.profile.academic.testScores, null, 2));
  return result;
}

