import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReceivingDocumentDto } from './dto/create-receiving-document.dto';
import { ReceivingDocumentsService } from './receiving-documents.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReceivingDocumentsController {
  constructor(private readonly service: ReceivingDocumentsService) {}

  @Get('delivery-orders/:deliveryOrderId/receiving-documents')
  list(@Param('deliveryOrderId') deliveryOrderId: string) {
    return this.service.listByDeliveryOrder(BigInt(deliveryOrderId));
  }

  @Post('delivery-orders/:deliveryOrderId/receiving-documents')
  create(
    @Param('deliveryOrderId') deliveryOrderId: string,
    @Body() dto: CreateReceivingDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(BigInt(deliveryOrderId), dto, user.id);
  }

  @Get('delivery-orders/:deliveryOrderId/receiving-evidence')
  summary(@Param('deliveryOrderId') deliveryOrderId: string) {
    return this.service.evidenceSummary(BigInt(deliveryOrderId));
  }

  @Get('receiving-documents/:id')
  get(@Param('id') id: string) {
    return this.service.get(BigInt(id));
  }
}
