import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyProfileService } from './company-profile.service';
import { CreateBankAccountDto, UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Controller('company-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyProfileController {
  constructor(private readonly service: CompanyProfileService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  upsert(@Body() dto: UpdateCompanyProfileDto) {
    return this.service.upsert(dto);
  }

  @Post('bank-accounts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE)
  addBank(@Body() dto: CreateBankAccountDto) {
    return this.service.addBank(dto);
  }
}
