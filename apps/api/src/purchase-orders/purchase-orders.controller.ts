import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get('projects/:projectId/purchase-orders')
  list(@Param('projectId') projectId: string) {
    return this.service.listByProject(BigInt(projectId));
  }

  @Post('projects/:projectId/purchase-orders')
  create(@Param('projectId') projectId: string, @Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(BigInt(projectId), dto, user.id);
  }

  @Get('purchase-orders/:id')
  get(@Param('id') id: string) {
    return this.service.get(BigInt(id));
  }

  @Patch('purchase-orders/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(BigInt(id), dto, user.id);
  }
}
