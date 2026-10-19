import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QuotationPrintService } from './quotation-print.service';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { DocumentsModule } from '../documents/documents.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, PrismaModule, ActivityLogsModule, DocumentsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService, QuotationPrintService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
