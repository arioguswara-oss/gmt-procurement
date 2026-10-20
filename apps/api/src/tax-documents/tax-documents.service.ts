import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  async verificationAccess(userId: bigint) {
    const configured = String(this.config.get('CORETAX_VERIFIER_USER_ID') ?? '');
    if (!/^[1-9]\d*$/.test(configured) || configured !== userId.toString()) return { canVerify: false };
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { active: true, role: true } });
    return { canVerify: !!user?.active && user.role !== 'VIEWER' };
  }

  async verify(invoiceId: bigint, taxId: bigint, userId: bigint) {
    if (!(await this.verificationAccess(userId)).canVerify) {
      throw new ForbiddenException('Hanya akun Pak Supri yang ditetapkan dapat memverifikasi Faktur Pajak');
    }
    return this.prisma.$transaction(async (tx) => {
      // Conditional update locks the proof row; replacement and attachment writes
      // use the same row, so a stale verification cannot resurrect REPLACED proof.
      const verifiedAt = new Date();
      const changed = await tx.taxDocument.updateMany({
        where: { id: taxId, invoiceId, status: TaxDocumentStatus.UPLOADED,
          invoice: { status: { not: InvoiceStatus.CANCELLED } },
          documents: { some: { documentType: DocumentType.TAX_INVOICE, invoiceId } } },
        data: { status: TaxDocumentStatus.VERIFIED, verifiedById: userId, verifiedAt },
      });
      if (changed.count !== 1) throw new BadRequestException('Faktur Pajak bukan upload aktif atau sudah diverifikasi/diganti');
      const tax = await tx.taxDocument.findUniqueOrThrow({ where: { id: taxId }, include: { invoice: true, documents: true } });
      await tx.activityLog.create({ data: {
        projectId: tax.invoice.projectId, userId, action: 'VERIFIED', entityType: 'TAX_DOCUMENT', entityId: taxId,
        description: 'Faktur Pajak Coretax diverifikasi secara eksplisit oleh Pak Supri',
        newValuesJson: { status: 'VERIFIED', verifiedById: userId.toString(), verifiedAt: verifiedAt.toISOString() },
      } });
      return tax;
    });
  }

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
          where: { invoiceId, id: { not: taxDocument.id }, status: { in: [TaxDocumentStatus.UPLOADED, TaxDocumentStatus.VERIFIED] } },
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
