import { Controller, Post, Body, HttpException, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { db } from '../database/config';
import { updateUserProfile, upsertUserProfile, getUserProfile } from '../database/users';

const UploadTranscriptSchema = z.object({
  userId: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
});

@Controller('transcript')
export class TranscriptController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTranscript(@UploadedFile() file: any, @Body() body: any) {
    try {
      console.log('[TRANSCRIPT] Upload request', { userId: body.userId, fileName: file?.originalname });
      
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      if (!body.userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      // Validate file type
      if (file.mimetype !== 'application/pdf') {
        throw new HttpException('Only PDF files are allowed', HttpStatus.BAD_REQUEST);
      }

      // For now, we'll store the file info directly
      // In a production environment, you'd upload to Firebase Storage or similar
      const transcriptData = {
        fileUrl: `uploads/transcripts/${body.userId}/${file.filename}`,
        fileName: file.originalname,
        uploadedAt: new Date().toISOString()
      };

      // Get current profile and update transcript
      const currentProfile = await getUserProfile(body.userId);
      if (currentProfile) {
        await updateUserProfile(body.userId, {
          profile: {
            ...currentProfile.profile,
            academic: {
              ...currentProfile.profile.academic,
              transcript: transcriptData
            }
          }
        });
      }

      console.log('[TRANSCRIPT] Transcript uploaded successfully for user:', body.userId);
      
      return { 
        success: true, 
        message: 'Transcript uploaded successfully',
        transcript: transcriptData
      };
    } catch (error: unknown) {
      console.error('[TRANSCRIPT] Error uploading transcript:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to upload transcript', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('update')
  async updateTranscript(@Body() body: unknown) {
    try {
      console.log('[TRANSCRIPT] Update request', body);
      const { userId, fileName, fileUrl } = UploadTranscriptSchema.parse(body);

      const transcriptData = {
        fileUrl,
        fileName,
        uploadedAt: new Date().toISOString()
      };

      // Get current profile and update transcript
      const currentProfile = await getUserProfile(userId);
      if (currentProfile) {
        await updateUserProfile(userId, {
          profile: {
            ...currentProfile.profile,
            academic: {
              ...currentProfile.profile.academic,
              transcript: transcriptData
            }
          }
        });
      }

      console.log('[TRANSCRIPT] Transcript updated successfully for user:', userId);
      
      return { 
        success: true, 
        message: 'Transcript updated successfully',
        transcript: transcriptData
      };
    } catch (error: unknown) {
      console.error('[TRANSCRIPT] Error updating transcript:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to update transcript', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 