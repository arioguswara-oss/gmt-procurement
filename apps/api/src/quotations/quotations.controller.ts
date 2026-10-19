import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { DocumentType, QuotationStatus } from '@prisma/client';
import { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocumentsService } from '../documents/documents.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationPrintService } from './quotation-print.service';
import { QuotationsService } from './quotations.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(
    private readonly service: QuotationsService,
    private readonly print: QuotationPrintService,
    private readonly pdf: PdfService,
    private readonly documents: DocumentsService,
  ) {}

  private filename(value: string) { return value.replace(/[^A-Za-z0-9._-]+/g, '_'); }

  @Get('projects/:projectId/quotations')
  list(@Param('projectId') projectId: string) { return this.service.listByProject(BigInt(projectId)); }

  @Post('projects/:projectId/quotations')
  create(@Param('projectId') projectId: string, @Body() dto: CreateQuotationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(BigInt(projectId), dto, user.id);
  }

  @Get('quotations/:id')
  get(@Param('id') id: string) { return this.service.get(BigInt(id)); }

  @Patch('quotations/:id')
  update(@Param('id') id: string, @Body() dto: UpdateQuotationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(BigInt(id), dto, user.id);
  }

  @Post('quotations/:id/send')
  send(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.send(BigInt(id), user.id); }

  @Post('quotations/:id/revise')
  revise(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.revise(BigInt(id), user.id); }

  @Post('quotations/:id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.setDecision(BigInt(id), 'ACCEPTED', user.id); }

  @Post('quotations/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.setDecision(BigInt(id), 'REJECTED', user.id); }

  @Post('quotations/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.cancel(BigInt(id), user.id); }

  @Get('quotations/:id/print-preview')
  async preview(@Param('id') id: string, @Res() response: Response) {
    response.type('text/html; charset=utf-8').send(await this.print.render(BigInt(id)));
  }

  @Get('quotations/:id/pdf')
  async pdfDownload(@Param('id') id: string, @Res() response: Response) {
    const row = await this.service.get(BigInt(id));
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    response.type('application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${this.filename(row.quotationNo)}_Rev${row.revisionNo}.pdf"`);
    response.send(buffer);
  }

  @Post('quotations/:id/archive-pdf')
  async archivePdf(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const row = await this.service.get(BigInt(id));
    if (row.status === QuotationStatus.DRAFT) throw new BadRequestException('Quotation DRAFT belum dapat diarsipkan sebagai PDF final');
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    return this.documents.storeGenerated({
      projectId: row.projectId,
      quotationId: row.id,
      documentType: DocumentType.QUOTATION_PDF,
      originalFilename: `${this.filename(row.quotationNo)}_Rev${row.revisionNo}.pdf`,
      buffer,
      userId: user.id,
      notes: `Archived quotation status ${row.status}`,
    });
  }
}
