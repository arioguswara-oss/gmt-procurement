import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProjectOriginDto } from './dto/upsert-project-origin.dto';

@Injectable()
export class ProjectOriginsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogsService,
  ) {}

  async get(projectId: bigint) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { origin: true } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    return project.origin;
  }

  async upsert(projectId: bigint, dto: UpsertProjectOriginDto, userId: bigint) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');

    const data = {
      externalReference: dto.externalReference,
      emailSubject: dto.emailSubject,
      senderName: dto.senderName,
      senderEmail: dto.senderEmail,
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
      quotationDeadline: dto.quotationDeadline ? new Date(dto.quotationDeadline) : undefined,
      notes: dto.notes,
    };

    const origin = await this.prisma.projectOrigin.upsert({
      where: { projectId },
      create: {
        projectId,
        originType: project.sourceType,
        createdById: userId,
        ...data,
      },
      update: data,
    });

    await this.activity.write({
      projectId,
      userId,
      action: 'UPSERTED',
      entityType: 'PROJECT_ORIGIN',
      entityId: origin.id,
      description: `Asal project ${project.gmtReference} diperbarui`,
    });
    return origin;
  }
}
