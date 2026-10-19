import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActivityLogsService } from './activity-logs.service';

@Controller('projects/:projectId/activity')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.service.list(BigInt(projectId));
  }
}
