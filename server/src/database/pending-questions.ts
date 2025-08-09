import { db } from './config';

export interface PendingQuestion {
  id: string;
  userId: string;
  applicationId?: string;
  question: string;
  context: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  answeredAt?: string;
  answer?: string;
}

export async function getPendingQuestionsByUserId(userId: string): Promise<PendingQuestion[]> {
  try {
    const questionsRef = db.collection('pending-questions');
    const snapshot = await questionsRef
      .where('userId', '==', userId)
      .where('answeredAt', '==', null)
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const questions: PendingQuestion[] = [];
    snapshot.forEach(doc => {
      questions.push({ id: doc.id, ...doc.data() } as PendingQuestion);
    });
    
    console.log('[PENDING-QUESTIONS] Retrieved pending questions for user:', userId, questions.length);
    return questions;
  } catch (error) {
    console.error('[PENDING-QUESTIONS] Error getting pending questions:', error);
    throw error;
  }
}

export async function createPendingQuestion(questionData: Partial<PendingQuestion>): Promise<PendingQuestion> {
  try {
    const questionsRef = db.collection('pending-questions');
    
    const question: PendingQuestion = {
      id: '',
      userId: questionData.userId || '',
      applicationId: questionData.applicationId,
      question: questionData.question || '',
      context: questionData.context || '',
      priority: questionData.priority || 'medium',
      createdAt: questionData.createdAt || new Date().toISOString(),
      answeredAt: questionData.answeredAt,
      answer: questionData.answer
    };

    const docRef = await questionsRef.add(question);
    const createdQuestion = { ...question, id: docRef.id };
    
    console.log('[PENDING-QUESTIONS] Created pending question:', docRef.id);
    return createdQuestion;
  } catch (error) {
    console.error('[PENDING-QUESTIONS] Error creating pending question:', error);
    throw error;
  }
}

export async function answerQuestion(questionId: string, answer: string): Promise<void> {
  try {
    const questionRef = db.collection('pending-questions').doc(questionId);
    
    await questionRef.update({
      answer,
      answeredAt: new Date().toISOString()
    });
    
    console.log('[PENDING-QUESTIONS] Answered question:', questionId);
  } catch (error) {
    console.error('[PENDING-QUESTIONS] Error answering question:', error);
    throw error;
  }
}

export async function generatePendingQuestions(userId: string, applicationId?: string): Promise<PendingQuestion[]> {
  try {
    // For now, return some sample questions
    // In a real implementation, this would use AI to generate contextual questions
    const sampleQuestions: PendingQuestion[] = [
      {
        id: '1',
        userId,
        applicationId,
        question: 'What motivated you to pursue this specific program?',
        context: 'Understanding your motivation and fit for the program',
        priority: 'high',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        userId,
        applicationId,
        question: 'How do you plan to contribute to the academic community?',
        context: 'Assessing your potential impact and engagement',
        priority: 'medium',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        userId,
        applicationId,
        question: 'What challenges have you overcome in your academic journey?',
        context: 'Understanding your resilience and problem-solving abilities',
        priority: 'medium',
        createdAt: new Date().toISOString()
      }
    ];

    // Save questions to database
    const questionsRef = db.collection('pending-questions');
    for (const question of sampleQuestions) {
      await questionsRef.add(question);
    }

    console.log('[PENDING-QUESTIONS] Generated pending questions for user:', userId, sampleQuestions.length);
    return sampleQuestions;
  } catch (error) {
    console.error('[PENDING-QUESTIONS] Error generating pending questions:', error);
    throw error;
  }
} 