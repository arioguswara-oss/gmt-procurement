import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryOrderStatus, DocumentType, Prisma } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceivingDocumentDto } from './dto/create-receiving-document.dto';

const receivingInclude = Prisma.validator<Prisma.ReceivingDocumentInclude>()({
  deliveryOrder: {
    include: {
      purchaseOrder: { include: { project: true } },
    },
  },
  documents: true,
  createdBy: { select: { id: true, name: true, email: true } },
});

@Injectable()
export class ReceivingDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogsService,
  ) {}

  async listByDeliveryOrder(deliveryOrderId: bigint) {
    const exists = await this.prisma.deliveryOrder.findUnique({ where: { id: deliveryOrderId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Delivery Order tidak ditemukan');
    return this.prisma.receivingDocument.findMany({
      where: { deliveryOrderId },
      include: receivingInclude,
      orderBy: [{ documentDate: 'asc' }, { id: 'asc' }],
    });
  }

  async get(id: bigint) {
    const row = await this.prisma.receivingDocument.findUnique({ where: { id }, include: receivingInclude });
    if (!row) throw new NotFoundException('Receiving Document tidak ditemukan');
    return row;
  }

  async create(deliveryOrderId: bigint, dto: CreateReceivingDocumentDto, userId: bigint) {
    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: { purchaseOrder: { select: { projectId: true } } },
    });
    if (!deliveryOrder) throw new NotFoundException('Delivery Order tidak ditemukan');
    if (deliveryOrder.status === DeliveryOrderStatus.DRAFT || deliveryOrder.status === DeliveryOrderStatus.CANCELLED) {
      throw new BadRequestException('Receiving evidence hanya dapat dicatat untuk DO yang sudah di-issue');
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.receivingDocument.create({
        data: {
          deliveryOrderId,
          documentType: dto.documentType,
          documentNo: dto.documentNo,
          documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
          receivedBy: dto.receivedBy,
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
          notes: dto.notes,
          createdById: userId,
        },
        include: receivingInclude,
      });

      if (deliveryOrder.status === DeliveryOrderStatus.ISSUED) {
        await tx.deliveryOrder.update({
          where: { id: deliveryOrderId },
          data: { status: DeliveryOrderStatus.AWAITING_RECEIPT, updatedById: userId },
        });
      }
      return created;
    });

    await this.activity.write({
      projectId: deliveryOrder.purchaseOrder.projectId,
      userId,
      action: 'CREATED',
      entityType: 'RECEIVING_DOCUMENT',
      entityId: row.id,
      description: `Receiving evidence ${row.documentType} dicatat untuk DO ${deliveryOrderId.toString()}`,
    });
    return row;
  }

  async evidenceSummary(deliveryOrderId: bigint) {
    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: {
        receivingDocuments: { include: { documents: true } },
        documents: true,
      },
    });
    if (!deliveryOrder) throw new NotFoundException('Delivery Order tidak ditemukan');

    const directEvidence = deliveryOrder.documents.filter((doc) =>
      doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT,
    );
    const receivingEvidence = deliveryOrder.receivingDocuments.flatMap((row) =>
      row.documents.filter((doc) => doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT),
    );

    return {
      deliveryOrderId,
      receivingRecords: deliveryOrder.receivingDocuments.length,
      evidenceFiles: [...directEvidence, ...receivingEvidence],
      hasEvidenceFile: directEvidence.length + receivingEvidence.length > 0,
    };
  }
}
