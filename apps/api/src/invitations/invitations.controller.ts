import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UpdateUserActiveDto } from './dto/update-user-active.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateInvitationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  users(@CurrentUser() user: AuthenticatedUser) {
    return this.service.users(user.id);
  }

  @Patch('users/:id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  setActive(@Param('id') id: string, @Body() dto: UpdateUserActiveDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setActive(user.id, BigInt(id), dto.active);
  }

  @Get('preview')
  preview(@Query('token') token: string) {
    return this.service.preview(token);
  }

  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto) {
    return this.service.accept(dto);
  }
}
