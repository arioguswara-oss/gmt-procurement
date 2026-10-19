import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { ReceiptPrintService } from './receipt-print.service';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [AuthModule, ActivityLogsModule, DocumentSequencesModule, DocumentsModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptPrintService],
  exports: [ReceiptsService, ReceiptPrintService],
})
export class ReceiptsModule {}
