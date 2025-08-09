import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { getRecentActivityByUserId } from '../database/activity';

@Controller('activity')
export class ActivityController {
  @Get()
  async getRecentActivity(@Query('userId') userId: string) {
    try {
      console.log('[ACTIVITY] Getting recent activity for user:', userId);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const activities = await getRecentActivityByUserId(userId);
      console.log('[ACTIVITY] Recent activity retrieved successfully:', activities.length);
      
      return { success: true, activities };
    } catch (error: unknown) {
      console.error('[ACTIVITY] Error getting recent activity:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to get recent activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 