import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { getProgramMatchesByUserId } from '../database/program-matches';
import * as fs from 'fs';
import * as path from 'path';

@Controller('program-matches')
export class ProgramMatchesController {
  @Get()
  async getProgramMatches(@Query('userId') userId: string) {
    try {
      console.log('[PROGRAM-MATCHES] Getting program matches for user:', userId);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const matches = await getProgramMatchesByUserId(userId);
      console.log('[PROGRAM-MATCHES] Program matches retrieved successfully:', matches.length);
      
      return { success: true, matches };
    } catch (error: unknown) {
      console.error('[PROGRAM-MATCHES] Error getting program matches:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to get program matches', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('all')
  async getAllPrograms() {
    try {
      console.log('[PROGRAM-MATCHES] Getting all programs');
      
      // Read programs from the JSON file
      const programsPath = path.join(__dirname, '../data/programs.json');
      const programsData = fs.readFileSync(programsPath, 'utf8');
      const programs = JSON.parse(programsData);
      
      console.log('[PROGRAM-MATCHES] All programs retrieved successfully:', programs.length);
      
      return { success: true, programs };
    } catch (error: unknown) {
      console.error('[PROGRAM-MATCHES] Error getting all programs:', error);
      if (error instanceof Error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to get all programs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 