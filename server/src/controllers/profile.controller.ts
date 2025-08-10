import { Controller, Post, Get, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { createUserProfile, getUserProfile, updateUserProfile } from '../database/users';

@Controller('profile')
export class ProfileController {
  @Post()
  async createProfile(@Body() body: any) {
    try {
      console.log('[PROFILE] Creating profile for user:', body.userId);
      
      const { userId, ...profileData } = body;
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await createUserProfile(userId, profileData);
      console.log('[PROFILE] Profile created successfully:', result);
      
      return { success: true, profile: result };
    } catch (error: unknown) {
      console.error('[PROFILE] Error creating profile:', error);

      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      throw new HttpException('Failed to create profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    try {
      console.log('🔥 [BACKEND API] GET /api/profile/:userId called with userId:', userId);
      
      const profile = await getUserProfile(userId);
      
      if (!profile) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }

      console.log('[PROFILE] Profile retrieved successfully');
      return { success: true, profile };
    } catch (error: unknown) {
      console.error('[PROFILE] Error getting profile:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to get profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':userId')
  async updateProfile(@Param('userId') userId: string, @Body() body: any) {
    try {
      console.log('[PROFILE] Updating profile for user:', userId);
      
      const result = await updateUserProfile(userId, body);
      console.log('[PROFILE] Profile updated successfully:', result);
      
      return { success: true, profile: result };
    } catch (error: unknown) {
      console.error('[PROFILE] Error updating profile:', error);

      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      throw new HttpException('Failed to update profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

