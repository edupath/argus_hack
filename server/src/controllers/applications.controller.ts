import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { getApplicationsByUserId, createApplication, updateApplication, deleteApplication } from '../database/applications';

@Controller('applications')
export class ApplicationsController {
  @Get()
  async getApplications(@Query('userId') userId: string) {
    try {
      console.log('[APPLICATIONS] Getting applications for user:', userId);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const applications = await getApplicationsByUserId(userId);
      console.log('[APPLICATIONS] Applications retrieved successfully:', applications.length);
      
      return { success: true, applications };
    } catch (error: unknown) {
      console.error('[APPLICATIONS] Error getting applications:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to get applications', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createApplication(@Body() body: any) {
    try {
      console.log('[APPLICATIONS] Creating application:', body);
      
      const result = await createApplication(body);
      console.log('[APPLICATIONS] Application created successfully:', result);
      
      return { success: true, application: result };
    } catch (error: unknown) {
      console.error('[APPLICATIONS] Error creating application:', error);
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to create application', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateApplication(@Param('id') id: string, @Body() body: any) {
    try {
      console.log('[APPLICATIONS] Updating application:', id);
      
      const result = await updateApplication(id, body);
      console.log('[APPLICATIONS] Application updated successfully:', result);
      
      return { success: true, application: result };
    } catch (error: unknown) {
      console.error('[APPLICATIONS] Error updating application:', error);
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to update application', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteApplication(@Param('id') id: string) {
    try {
      console.log('[APPLICATIONS] Deleting application:', id);
      
      await deleteApplication(id);
      console.log('[APPLICATIONS] Application deleted successfully');
      
      return { success: true };
    } catch (error: unknown) {
      console.error('[APPLICATIONS] Error deleting application:', error);
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to delete application', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 