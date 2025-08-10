import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './controllers/chat.controller';
import { ProfileController } from './controllers/profile.controller';
import { ApplicationController } from './controllers/application.controller';
import { ApplicationsController } from './controllers/applications.controller';
import { ActivityController } from './controllers/activity.controller';
import { ProgramMatchesController } from './controllers/program-matches.controller';
import { PendingQuestionsController } from './controllers/pending-questions.controller';
import { CounselingHistoryController } from './controllers/counseling-history.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    ChatController,
    ProfileController,
    ApplicationController,
    ApplicationsController,
    ActivityController,
    ProgramMatchesController,
    PendingQuestionsController,
    CounselingHistoryController,
  ],
})
export class AppModule {}

