import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentType, InvoiceStatus, TaxDocumentStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadTaxDocumentDto } from './dto/upload-tax-document.dto';
import { assertTaxInvoiceFile } from '../documents/tax-invoice-file-validator';

@Injectable()
export class TaxDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly activity: ActivityLogsService,
  ) {}

  async list(invoiceId: bigint) {
    const exists = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Invoice tidak ditemukan');
    return this.prisma.taxDocument.findMany({
      where: { invoiceId },
      include: { documents: true, uploadedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async upload(invoiceId: bigint, dto: UploadTaxDocumentDto, file: Express.Multer.File, userId: bigint) {
    if (!file) throw new BadRequestException('File Faktur Pajak wajib diupload');
    assertTaxInvoiceFile(file); // reject invalid scan BEFORE allocating taxDocument
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: { project: true } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.WAITING_TAX_INVOICE && invoice.status !== InvoiceStatus.READY_TO_FINALIZE) {
      throw new BadRequestException('Faktur Pajak hanya dapat diupload sebelum Invoice FINAL');
    }

    const taxDocument = await this.prisma.taxDocument.create({
      data: {
        invoiceId,
        documentNo: dto.documentNo,
        documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
        status: TaxDocumentStatus.UPLOADED,
        uploadedById: userId,
        notes: dto.notes,
      },
    });

    try {
      const document = await this.documents.upload(invoice.projectId, {
        documentType: DocumentType.TAX_INVOICE,
        invoiceId: invoiceId.toString(),
        taxDocumentId: taxDocument.id.toString(),
        notes: dto.notes,
      }, file, userId);

      await this.prisma.$transaction(async (tx) => {
        await tx.taxDocument.updateMany({
          where: { invoiceId, id: { not: taxDocument.id }, status: TaxDocumentStatus.UPLOADED },
          data: { status: TaxDocumentStatus.REPLACED },
        });
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: InvoiceStatus.READY_TO_FINALIZE, updatedById: userId },
        });
      });

      await this.activity.write({
        projectId: invoice.projectId,
        userId,
        action: 'UPLOADED',
        entityType: 'TAX_DOCUMENT',
        entityId: taxDocument.id,
        description: `Faktur Pajak Coretax diupload untuk Invoice ${invoice.invoiceNo}`,
      });
      return { taxDocument: await this.prisma.taxDocument.findUnique({ where: { id: taxDocument.id }, include: { documents: true } }), document };
    } catch (error) {
      await this.prisma.taxDocument.delete({ where: { id: taxDocument.id } }).catch(() => undefined);
      throw error;
    }
  }
}
