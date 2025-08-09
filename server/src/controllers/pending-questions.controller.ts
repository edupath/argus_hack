import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { getPendingQuestionsByUserId } from '../database/pending-questions';

@Controller('pending-questions')
export class PendingQuestionsController {
  @Get()
  async getPendingQuestions(@Query('userId') userId: string) {
    try {
      console.log('[PENDING-QUESTIONS] Getting pending questions for user:', userId);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const questions = await getPendingQuestionsByUserId(userId);
      console.log('[PENDING-QUESTIONS] Pending questions retrieved successfully:', questions.length);
      
      return { success: true, questions };
    } catch (error: unknown) {
      console.error('[PENDING-QUESTIONS] Error getting pending questions:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to get pending questions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 