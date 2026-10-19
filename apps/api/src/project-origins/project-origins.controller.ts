import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpsertProjectOriginDto } from './dto/upsert-project-origin.dto';
import { ProjectOriginsService } from './project-origins.service';

@Controller('projects/:projectId/origin')
@UseGuards(JwtAuthGuard)
export class ProjectOriginsController {
  constructor(private readonly service: ProjectOriginsService) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.service.get(BigInt(projectId));
  }

  @Put()
  upsert(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertProjectOriginDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upsert(BigInt(projectId), dto, user.id);
  }
}
