import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { AuthModule } from '../auth/auth.module';
import { ReceivingDocumentsController } from './receiving-documents.controller';
import { ReceivingDocumentsService } from './receiving-documents.service';

@Module({
  imports: [AuthModule, ActivityLogsModule],
  controllers: [ReceivingDocumentsController],
  providers: [ReceivingDocumentsService],
  exports: [ReceivingDocumentsService],
})
export class ReceivingDocumentsModule {}
