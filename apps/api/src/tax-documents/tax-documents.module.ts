import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { TaxDocumentsController } from './tax-documents.controller';
import { TaxDocumentsService } from './tax-documents.service';

@Module({
  imports: [AuthModule, ActivityLogsModule, DocumentsModule],
  controllers: [TaxDocumentsController],
  providers: [TaxDocumentsService],
})
export class TaxDocumentsModule {}
