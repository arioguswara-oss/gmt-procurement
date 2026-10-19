import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { DeliveryOrderStatus, DocumentType } from '@prisma/client';
import { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocumentsService } from '../documents/documents.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto';
import { UpdateDeliveryOrderDto } from './dto/update-delivery-order.dto';
import { DeliveryOrderPrintService } from './delivery-order-print.service';
import { DeliveryOrdersService } from './delivery-orders.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class DeliveryOrdersController {
  constructor(
    private readonly service: DeliveryOrdersService,
    private readonly print: DeliveryOrderPrintService,
    private readonly pdf: PdfService,
    private readonly documents: DocumentsService,
  ) {}

  private filename(value: string) { return value.replace(/[^A-Za-z0-9._-]+/g, '_'); }

  @Get('purchase-orders/:purchaseOrderId/delivery-orders')
  list(@Param('purchaseOrderId') purchaseOrderId: string) { return this.service.listByPurchaseOrder(BigInt(purchaseOrderId)); }

  @Post('purchase-orders/:purchaseOrderId/delivery-orders')
  create(@Param('purchaseOrderId') purchaseOrderId: string, @Body() dto: CreateDeliveryOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(BigInt(purchaseOrderId), dto, user.id);
  }

  @Get('delivery-orders/:id')
  get(@Param('id') id: string) { return this.service.get(BigInt(id)); }

  @Get('delivery-orders/:id/matrix')
  matrix(@Param('id') id: string) { return this.service.deliveryMatrix(BigInt(id)); }

  @Patch('delivery-orders/:id')
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(BigInt(id), dto, user.id);
  }

  @Post('delivery-orders/:id/issue')
  issue(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.issue(BigInt(id), user.id); }

  @Post('delivery-orders/:id/received')
  received(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.markReceived(BigInt(id), user.id); }

  @Post('delivery-orders/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.cancel(BigInt(id), user.id); }

  @Get('delivery-orders/:id/print-preview')
  async preview(@Param('id') id: string, @Res() response: Response) {
    response.type('text/html; charset=utf-8').send(await this.print.render(BigInt(id)));
  }

  @Get('delivery-orders/:id/pdf')
  async pdfDownload(@Param('id') id: string, @Res() response: Response) {
    const row = await this.service.get(BigInt(id));
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    response.type('application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${this.filename(row.doNo)}.pdf"`);
    response.send(buffer);
  }

  @Post('delivery-orders/:id/archive-pdf')
  async archivePdf(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const row = await this.service.get(BigInt(id));
    if (row.status === DeliveryOrderStatus.DRAFT || row.status === DeliveryOrderStatus.CANCELLED) {
      throw new BadRequestException('DO DRAFT/CANCELLED belum dapat diarsipkan sebagai PDF');
    }
    const buffer = await this.pdf.htmlToPdf(await this.print.render(row.id));
    return this.documents.storeGenerated({
      projectId: row.purchaseOrder.projectId,
      purchaseOrderId: row.purchaseOrderId,
      deliveryOrderId: row.id,
      documentType: DocumentType.DELIVERY_ORDER_PDF,
      originalFilename: `${this.filename(row.doNo)}.pdf`,
      buffer,
      userId: user.id,
      notes: `Archived delivery order status ${row.status}`,
    });
  }
}
