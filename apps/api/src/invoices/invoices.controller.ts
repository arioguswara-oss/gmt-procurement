import { BadRequestException, Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { DocumentType, InvoiceStatus } from '@prisma/client';
import { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocumentsService } from '../documents/documents.service';
import { PdfService } from '../pdf/pdf.service';
import { BillingPackagePdfService } from './billing-package-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicePrintService } from './invoice-print.service';
import { InvoicesService } from './invoices.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    private readonly service: InvoicesService,
    private readonly print: InvoicePrintService,
    private readonly pdf: PdfService,
    private readonly documents: DocumentsService,
    private readonly billingPackage: BillingPackagePdfService,
  ) {}

  private filename(value: string) { return value.replace(/[^A-Za-z0-9._-]+/g, '_'); }

  @Get('projects/:projectId/invoices')
  list(@Param('projectId') projectId: string) { return this.service.listByProject(BigInt(projectId)); }

  @Post('purchase-orders/:purchaseOrderId/invoices')
  create(@Param('purchaseOrderId') purchaseOrderId: string, @Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(BigInt(purchaseOrderId), dto, user.id);
  }

  @Get('invoices/:id')
  get(@Param('id') id: string) { return this.service.get(BigInt(id)); }

  @Post('invoices/:id/submit-for-tax')
  submitForTax(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.submitForTax(BigInt(id), user.id); }

  @Post('invoices/:id/finalize')
  finalize(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.finalize(BigInt(id), user.id); }

  @Post('invoices/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.cancel(BigInt(id), user.id); }

  @Get('invoices/:id/billing-package')
  package(@Param('id') id: string) { return this.service.billingPackageManifest(BigInt(id)); }

  @Get('invoices/:id/print-preview')
  async preview(@Param('id') id: string, @Res() response: Response) {
    response.type('text/html; charset=utf-8').send(await this.print.render(BigInt(id)));
  }

  @Get('invoices/:id/pdf')
  async pdfDownload(@Param('id') id: string, @Res() response: Response) {
    const row = await this.service.get(BigInt(id));
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    response.type('application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${this.filename(row.invoiceNo)}.pdf"`);
    response.send(buffer);
  }

  @Post('invoices/:id/archive-pdf')
  async archivePdf(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const row = await this.service.get(BigInt(id));
    if (row.status !== InvoiceStatus.FINAL) throw new BadRequestException('Hanya Invoice FINAL yang dapat diarsipkan sebagai PDF');
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    return this.documents.storeGenerated({
      projectId: row.projectId,
      purchaseOrderId: row.purchaseOrderId,
      invoiceId: row.id,
      documentType: DocumentType.INVOICE_PDF,
      originalFilename: `${this.filename(row.invoiceNo)}.pdf`,
      buffer,
      userId: user.id,
      notes: 'Archived FINAL Invoice',
    });
  }

  @Get('invoices/:id/billing-package.pdf')
  async billingPackagePdf(@Param('id') id: string, @Res() response: Response) {
    const built = await this.billingPackage.build(BigInt(id));
    response.type('application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${this.filename(built.invoice.invoiceNo)}_Billing_Package.pdf"`);
    response.send(built.buffer);
  }

  @Post('invoices/:id/archive-billing-package')
  archiveBillingPackage(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingPackage.archive(BigInt(id), user.id);
  }
}
