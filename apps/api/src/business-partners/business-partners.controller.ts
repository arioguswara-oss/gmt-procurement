import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BusinessPartnersService } from './business-partners.service';
import { CreateBusinessPartnerDto, CreatePartnerContactDto } from './dto/create-business-partner.dto';
import { UpdateBusinessPartnerDto } from './dto/update-business-partner.dto';

@Controller('business-partners')
@UseGuards(JwtAuthGuard)
export class BusinessPartnersController {
  constructor(private readonly service: BusinessPartnersService) {}

  @Get()
  list(@Query('search') search?: string) {
    return this.service.list(search);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(BigInt(id));
  }

  @Post()
  create(@Body() dto: CreateBusinessPartnerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessPartnerDto) {
    return this.service.update(BigInt(id), dto);
  }

  @Post(':id/contacts')
  addContact(@Param('id') id: string, @Body() dto: CreatePartnerContactDto) {
    return this.service.addContact(BigInt(id), dto);
  }
}
