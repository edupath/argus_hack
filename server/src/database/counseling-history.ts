import { db } from './config';

interface CounselingHistory {
  userId: string;
  chatHistory: any[];
  updatedAt: string;
}

export async function getCounselingHistory(userId: string): Promise<CounselingHistory | null> {
  try {
    const docRef = db.collection('counselingHistory').doc(userId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return docSnap.data() as CounselingHistory;
    } else {
      return null;
    }
  } catch (error: unknown) {
    console.error('Error getting counseling history:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get counseling history: ${message}`);
  }
}

export async function storeCounselingHistory(data: CounselingHistory): Promise<CounselingHistory> {
  try {
    const docRef = db.collection('counselingHistory').doc(data.userId);
    
    // Check if document exists
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      // Update existing document
      await docRef.update({
        chatHistory: data.chatHistory,
        updatedAt: data.updatedAt
      });
    } else {
      // Create new document
      await docRef.set(data);
    }
    
    return data;
  } catch (error: unknown) {
    console.error('Error storing counseling history:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to store counseling history: ${message}`);
  }
} 