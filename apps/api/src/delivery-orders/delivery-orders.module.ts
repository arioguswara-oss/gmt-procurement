import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DeliveryOrderPrintService } from './delivery-order-print.service';
import { DeliveryOrdersController } from './delivery-orders.controller';
import { DeliveryOrdersService } from './delivery-orders.service';
import { DocumentsModule } from '../documents/documents.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, PrismaModule, ActivityLogsModule, DocumentSequencesModule, DocumentsModule],
  controllers: [DeliveryOrdersController],
  providers: [DeliveryOrdersService, DeliveryOrderPrintService],
  exports: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
