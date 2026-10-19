import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompanyProfileModule } from './company-profile/company-profile.module';
import { BusinessPartnersModule } from './business-partners/business-partners.module';
import { ProjectsModule } from './projects/projects.module';
import { ProjectOriginsModule } from './project-origins/project-origins.module';
import { DocumentsModule } from './documents/documents.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { DocumentSequencesModule } from './document-sequences/document-sequences.module';
import { QuotationsModule } from './quotations/quotations.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { DeliveryOrdersModule } from './delivery-orders/delivery-orders.module';
import { ReceivingDocumentsModule } from './receiving-documents/receiving-documents.module';
import { InvoicesModule } from './invoices/invoices.module';
import { TaxDocumentsModule } from './tax-documents/tax-documents.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthController } from './health.controller';
import { PdfModule } from './pdf/pdf.module';
import { validateEnvironment } from './config/env.validation';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    PdfModule,
    UsersModule,
    AuthModule,
    CompanyProfileModule,
    BusinessPartnersModule,
    ActivityLogsModule,
    DocumentSequencesModule,
    ProjectsModule,
    ProjectOriginsModule,
    DocumentsModule,
    QuotationsModule,
    PurchaseOrdersModule,
    DeliveryOrdersModule,
    ReceivingDocumentsModule,
    InvoicesModule,
    TaxDocumentsModule,
    ReceiptsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
