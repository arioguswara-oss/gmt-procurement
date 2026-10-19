import { BadRequestException, Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { DocumentType, ReceiptStatus } from '@prisma/client';
import { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocumentsService } from '../documents/documents.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptPrintService } from './receipt-print.service';
import { ReceiptsService } from './receipts.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(
    private readonly service: ReceiptsService,
    private readonly print: ReceiptPrintService,
    private readonly pdf: PdfService,
    private readonly documents: DocumentsService,
  ) {}

  private filename(value: string) { return value.replace(/[^A-Za-z0-9._-]+/g, '_'); }

  @Post('invoices/:invoiceId/receipt')
  create(@Param('invoiceId') invoiceId: string, @Body() dto: CreateReceiptDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(BigInt(invoiceId), dto, user.id);
  }

  @Get('invoices/:invoiceId/receipt')
  byInvoice(@Param('invoiceId') invoiceId: string) { return this.service.getByInvoice(BigInt(invoiceId)); }

  @Get('receipts/:id')
  get(@Param('id') id: string) { return this.service.get(BigInt(id)); }

  @Post('receipts/:id/finalize')
  finalize(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.finalize(BigInt(id), user.id); }

  @Get('receipts/:id/print-preview')
  async preview(@Param('id') id: string, @Res() response: Response) {
    response.type('text/html; charset=utf-8').send(await this.print.render(BigInt(id)));
  }

  @Get('receipts/:id/pdf')
  async pdfDownload(@Param('id') id: string, @Res() response: Response) {
    const row = await this.service.get(BigInt(id));
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    response.type('application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${this.filename(row.receiptNo)}.pdf"`);
    response.send(buffer);
  }

  @Post('receipts/:id/archive-pdf')
  async archivePdf(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const row = await this.service.get(BigInt(id));
    if (row.status !== ReceiptStatus.FINAL) throw new BadRequestException('Hanya Kwitansi FINAL yang dapat diarsipkan sebagai PDF');
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    return this.documents.storeGenerated({
      projectId: row.invoice.projectId,
      invoiceId: row.invoiceId,
      receiptId: row.id,
      documentType: DocumentType.RECEIPT_PDF,
      originalFilename: `${this.filename(row.receiptNo)}.pdf`,
      buffer,
      userId: user.id,
      notes: 'Archived FINAL Kwitansi',
    });
  }
}
