import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentSequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async next(documentType: string, periodKey: string, prefix: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.documentSequence.upsert({
        where: { documentType_periodKey: { documentType, periodKey } },
        create: { documentType, periodKey, prefix, lastNumber: 0 },
        update: { prefix },
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE document_sequences
        SET last_number = LAST_INSERT_ID(last_number + 1), prefix = ${prefix}
        WHERE document_type = ${documentType} AND period_key = ${periodKey}
      `);
      const rows = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT LAST_INSERT_ID() AS seq`);
      return Number(rows[0].seq);
    });
  }
}
