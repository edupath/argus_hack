import { db } from './config';
import { getUserProfile } from './users';

export interface ProgramMatch {
  id: string;
  userId: string;
  programId: string;
  programName: string;
  university: string;
  matchScore: number;
  reasons: string[];
  createdAt: string;
}

export async function getProgramMatchesByUserId(userId: string): Promise<ProgramMatch[]> {
  try {
    const matchesRef = db.collection('program-matches');
    const snapshot = await matchesRef.where('userId', '==', userId).orderBy('matchScore', 'desc').limit(10).get();
    
    const matches: ProgramMatch[] = [];
    snapshot.forEach(doc => {
      matches.push({ id: doc.id, ...doc.data() } as ProgramMatch);
    });
    
    console.log('[PROGRAM-MATCHES] Retrieved program matches for user:', userId, matches.length);
    return matches;
  } catch (error: unknown) {
    console.error('[PROGRAM-MATCHES] Error getting program matches:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get program matches: ${message}`);
  }
}

export async function generateProgramMatches(userId: string): Promise<ProgramMatch[]> {
  try {
    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // For now, return some sample matches based on user profile
    // In a real implementation, this would use AI/ML to match programs
    const sampleMatches: ProgramMatch[] = [
      {
        id: '1',
        userId,
        programId: 'ms-data-science-stanford',
        programName: 'MS Data Science',
        university: 'Stanford University',
        matchScore: 95,
        reasons: ['Strong academic background', 'Matches your field of interest', 'Within your budget range'],
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        userId,
        programId: 'mba-mit-sloan',
        programName: 'MBA',
        university: 'MIT Sloan',
        matchScore: 88,
        reasons: ['Excellent business program', 'Good fit for your career goals', 'Reputable institution'],
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        userId,
        programId: 'ms-cs-berkeley',
        programName: 'MS Computer Science',
        university: 'UC Berkeley',
        matchScore: 82,
        reasons: ['Top-ranked CS program', 'Strong research opportunities', 'Silicon Valley location'],
        createdAt: new Date().toISOString()
      }
    ];

    // Save matches to database
    const matchesRef = db.collection('program-matches');
    for (const match of sampleMatches) {
      await matchesRef.add(match);
    }

    console.log('[PROGRAM-MATCHES] Generated program matches for user:', userId, sampleMatches.length);
    return sampleMatches;
  } catch (error: unknown) {
    console.error('[PROGRAM-MATCHES] Error generating program matches:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to generate program matches: ${message}`);
  }
}

export async function createProgramMatch(matchData: Partial<ProgramMatch>): Promise<ProgramMatch> {
  try {
    const matchesRef = db.collection('program-matches');
    
    const match: ProgramMatch = {
      id: '',
      userId: matchData.userId || '',
      programId: matchData.programId || '',
      programName: matchData.programName || '',
      university: matchData.university || '',
      matchScore: matchData.matchScore || 0,
      reasons: matchData.reasons || [],
      createdAt: matchData.createdAt || new Date().toISOString()
    };

    const docRef = await matchesRef.add(match);
    const createdMatch = { ...match, id: docRef.id };
    
    console.log('[PROGRAM-MATCHES] Created program match:', docRef.id);
    return createdMatch;
  } catch (error: unknown) {
    console.error('[PROGRAM-MATCHES] Error creating program match:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to create program match: ${message}`);
  }
} 