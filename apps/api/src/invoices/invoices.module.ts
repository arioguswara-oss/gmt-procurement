import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { DocumentsModule } from '../documents/documents.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { InvoicePrintService } from './invoice-print.service';
import { BillingPackagePdfService } from './billing-package-pdf.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuthModule, ActivityLogsModule, DocumentSequencesModule, DocumentsModule, ReceiptsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePrintService, BillingPackagePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
