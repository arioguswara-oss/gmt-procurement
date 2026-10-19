import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface WriteActivityInput {
  projectId: bigint;
  userId: bigint;
  action: string;
  entityType: string;
  entityId?: bigint;
  description?: string;
  oldValuesJson?: Prisma.InputJsonValue;
  newValuesJson?: Prisma.InputJsonValue;
  ipAddress?: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  write(input: WriteActivityInput) {
    return this.prisma.activityLog.create({ data: input });
  }

  list(projectId: bigint) {
    return this.prisma.activityLog.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
