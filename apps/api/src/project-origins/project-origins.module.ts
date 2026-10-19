import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectOriginsController } from './project-origins.controller';
import { ProjectOriginsService } from './project-origins.service';

@Module({
  imports: [AuthModule, ActivityLogsModule],
  controllers: [ProjectOriginsController],
  providers: [ProjectOriginsService],
})
export class ProjectOriginsModule {}
