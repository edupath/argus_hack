import { Controller, Get, Post, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { getCounselingHistory, storeCounselingHistory } from '../database/counseling-history';

@Controller('counseling-history')
export class CounselingHistoryController {
  @Get()
  async getCounselingHistory(@Query('userId') userId: string) {
    try {
      console.log('[COUNSELING-HISTORY] Getting counseling history for user:', userId);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const history = await getCounselingHistory(userId);
      console.log('[COUNSELING-HISTORY] History retrieved successfully');
      
      return { success: true, chatHistory: history?.chatHistory || [] };
    } catch (error: unknown) {
      console.error('[COUNSELING-HISTORY] Error getting history:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to get counseling history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async storeCounselingHistory(@Body() body: any) {
    try {
      console.log('[COUNSELING-HISTORY] Storing counseling history:', body);
      
      const result = await storeCounselingHistory(body);
      console.log('[COUNSELING-HISTORY] History stored successfully');
      
      return { success: true, history: result };
    } catch (error: unknown) {
      console.error('[COUNSELING-HISTORY] Error storing history:', error);
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to store counseling history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 