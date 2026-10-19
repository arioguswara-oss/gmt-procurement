import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { DocumentType, ReceiptStatus, TaxDocumentStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertInvoicePrintable } from '../common/print/tax-invoice-print-gate';
import { UploadDocumentDto } from './upload-document.dto';
import { assertTaxInvoiceFile } from './tax-invoice-file-validator';

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.msg', '.eml', '.docx', '.doc', '.zip',
]);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly activity: ActivityLogsService,
  ) {}

  private storageRoot() {
    return resolve(process.cwd(), this.config.get('STORAGE_ROOT') ?? '../../storage');
  }

  private safeFolderName(value: string) {
    return value.trim().replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 120) || 'project';
  }

  private async assertBelongsToProject(projectId: bigint, dto: UploadDocumentDto) {
    const checks: Array<Promise<boolean>> = [];

    if (dto.projectOriginId) {
      checks.push(this.prisma.projectOrigin.findFirst({ where: { id: BigInt(dto.projectOriginId), projectId }, select: { id: true } }).then(Boolean));
    }
    if (dto.quotationId) {
      checks.push(this.prisma.quotation.findFirst({ where: { id: BigInt(dto.quotationId), projectId }, select: { id: true } }).then(Boolean));
    }
    if (dto.purchaseOrderId) {
      checks.push(this.prisma.purchaseOrder.findFirst({ where: { id: BigInt(dto.purchaseOrderId), projectId }, select: { id: true } }).then(Boolean));
    }
    if (dto.deliveryOrderId) {
      checks.push(this.prisma.deliveryOrder.findFirst({
        where: { id: BigInt(dto.deliveryOrderId), purchaseOrder: { projectId } }, select: { id: true },
      }).then(Boolean));
    }
    if (dto.receivingDocumentId) {
      checks.push(this.prisma.receivingDocument.findFirst({
        where: { id: BigInt(dto.receivingDocumentId), deliveryOrder: { purchaseOrder: { projectId } } }, select: { id: true },
      }).then(Boolean));
    }
    if (dto.invoiceId) {
      checks.push(this.prisma.invoice.findFirst({ where: { id: BigInt(dto.invoiceId), projectId }, select: { id: true } }).then(Boolean));
    }
    if (dto.taxDocumentId) {
      checks.push(this.prisma.taxDocument.findFirst({
        where: { id: BigInt(dto.taxDocumentId), invoice: { projectId } }, select: { id: true },
      }).then(Boolean));
    }
    if (dto.receiptId) {
      checks.push(this.prisma.receipt.findFirst({
        where: { id: BigInt(dto.receiptId), invoice: { projectId } }, select: { id: true },
      }).then(Boolean));
    }
    if (dto.paymentId) {
      checks.push(this.prisma.payment.findFirst({
        where: { id: BigInt(dto.paymentId), invoice: { projectId } }, select: { id: true },
      }).then(Boolean));
    }

    if ((await Promise.all(checks)).some((valid) => !valid)) {
      throw new BadRequestException('Dokumen target tidak berada pada project ini');
    }
  }

  async list(projectId: bigint) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    return this.prisma.document.findMany({
      where: { projectId },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async upload(projectId: bigint, dto: UploadDocumentDto, file: Express.Multer.File, userId: bigint) {
    if (!file) throw new BadRequestException('File wajib diupload');
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    await this.assertBelongsToProject(projectId, dto);

    // Apply the same Coretax rule even via generic project-document uploads.
    if (dto.documentType === DocumentType.TAX_INVOICE) {
      assertTaxInvoiceFile(file);
      if (!dto.invoiceId || !dto.taxDocumentId ||
          !/^\d+$/.test(dto.invoiceId) || !/^\d+$/.test(dto.taxDocumentId)) {
        throw new BadRequestException('Faktur Pajak wajib terhubung ke Invoice dan record Faktur Pajak');
      }
      const linkedTax = await this.prisma.taxDocument.findFirst({
        where: {
          id: BigInt(dto.taxDocumentId),
          invoiceId: BigInt(dto.invoiceId),
          status: TaxDocumentStatus.UPLOADED,
          invoice: { projectId },
        },
        select: { id: true },
      });
      if (!linkedTax) throw new BadRequestException('Relasi Faktur Pajak aktif dan Invoice tidak cocok');
    }

    const extension = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) throw new BadRequestException(`Tipe file ${extension || '(tanpa ekstensi)'} belum diizinkan`);

    const maxMb = Number(this.config.get('MAX_UPLOAD_MB') ?? 25);
    if (file.size > maxMb * 1024 * 1024) throw new BadRequestException(`Ukuran file melebihi ${maxMb} MB`);

    const year = project.createdAt.getFullYear().toString();
    const projectFolder = this.safeFolderName(project.gmtReference);
    const folder = join(this.storageRoot(), 'projects', year, projectFolder, dto.documentType.toLowerCase());
    await mkdir(folder, { recursive: true });

    const storedFilename = `${randomUUID()}${extension}`;
    const storagePath = join(folder, storedFilename);
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    await writeFile(storagePath, file.buffer, { flag: 'wx' });

    try {
      const document = await this.prisma.document.create({
        data: {
          projectId,
          projectOriginId: dto.projectOriginId ? BigInt(dto.projectOriginId) : undefined,
          quotationId: dto.quotationId ? BigInt(dto.quotationId) : undefined,
          purchaseOrderId: dto.purchaseOrderId ? BigInt(dto.purchaseOrderId) : undefined,
          deliveryOrderId: dto.deliveryOrderId ? BigInt(dto.deliveryOrderId) : undefined,
          receivingDocumentId: dto.receivingDocumentId ? BigInt(dto.receivingDocumentId) : undefined,
          invoiceId: dto.invoiceId ? BigInt(dto.invoiceId) : undefined,
          taxDocumentId: dto.taxDocumentId ? BigInt(dto.taxDocumentId) : undefined,
          receiptId: dto.receiptId ? BigInt(dto.receiptId) : undefined,
          paymentId: dto.paymentId ? BigInt(dto.paymentId) : undefined,
          documentType: dto.documentType,
          originalFilename: file.originalname,
          storedFilename,
          storagePath,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSize: BigInt(file.size),
          sha256,
          notes: dto.notes,
          uploadedById: userId,
        },
      });

      await this.activity.write({
        projectId,
        userId,
        action: 'UPLOADED',
        entityType: 'DOCUMENT',
        entityId: document.id,
        description: `${dto.documentType}: ${file.originalname}`,
      });
      return document;
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }
  }


  async storeGenerated(input: {
    projectId: bigint;
    documentType: DocumentType;
    originalFilename: string;
    buffer: Buffer;
    userId: bigint;
    quotationId?: bigint;
    purchaseOrderId?: bigint;
    deliveryOrderId?: bigint;
    invoiceId?: bigint;
    receiptId?: bigint;
    notes?: string;
  }) {
    const project = await this.prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');

    const year = project.createdAt.getFullYear().toString();
    const projectFolder = this.safeFolderName(project.gmtReference);
    const folder = join(this.storageRoot(), 'projects', year, projectFolder, input.documentType.toLowerCase());
    await mkdir(folder, { recursive: true });

    const storedFilename = `${randomUUID()}.pdf`;
    const storagePath = join(folder, storedFilename);
    const sha256 = createHash('sha256').update(input.buffer).digest('hex');
    await writeFile(storagePath, input.buffer, { flag: 'wx' });
    try {
      const document = await this.prisma.document.create({
        data: {
          projectId: input.projectId,
          quotationId: input.quotationId,
          purchaseOrderId: input.purchaseOrderId,
          deliveryOrderId: input.deliveryOrderId,
          invoiceId: input.invoiceId,
          receiptId: input.receiptId,
          documentType: input.documentType,
          originalFilename: input.originalFilename,
          storedFilename,
          storagePath,
          mimeType: 'application/pdf',
          fileSize: BigInt(input.buffer.length),
          sha256,
          notes: input.notes ?? 'Generated by GMT Procurement Web App',
          uploadedById: input.userId,
        },
      });
      await this.activity.write({
        projectId: input.projectId,
        userId: input.userId,
        action: 'GENERATED_PDF',
        entityType: 'DOCUMENT',
        entityId: document.id,
        description: `${input.documentType}: ${input.originalFilename}`,
      });
      return document;
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }
  }

  async readBuffer(id: bigint) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan');
    if (!existsSync(document.storagePath)) throw new NotFoundException('File fisik tidak ditemukan di storage');
    const { readFile } = await import('fs/promises');
    return { document, buffer: await readFile(document.storagePath) };
  }

  async download(id: bigint) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan');

    // Archived PDFs must not bypass the mandatory Coretax gate enforced by
    // the live Invoice/Kwitansi render and PDF routes.
    if (document.documentType === DocumentType.INVOICE_PDF ||
        document.documentType === DocumentType.RECEIPT_PDF ||
        document.documentType === DocumentType.BILLING_PACKAGE_PDF) {
      if (!document.invoiceId) {
        throw new BadRequestException('Arsip tagihan tidak terhubung ke Invoice yang sah');
      }
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: document.invoiceId },
        include: { taxDocuments: { include: { documents: true } } },
      });
      if (!invoice || invoice.projectId !== document.projectId) {
        throw new BadRequestException('Arsip tagihan tidak terhubung ke Invoice project ini');
      }
      assertInvoicePrintable(invoice);
      if (document.documentType === DocumentType.RECEIPT_PDF) {
        if (!document.receiptId) throw new BadRequestException('Arsip Kwitansi tidak terhubung ke Kwitansi FINAL');
        const receipt = await this.prisma.receipt.findUnique({
          where: { id: document.receiptId },
          select: { invoiceId: true, status: true },
        });
        if (!receipt || receipt.invoiceId !== invoice.id || receipt.status !== ReceiptStatus.FINAL) {
          throw new BadRequestException('Hanya arsip Kwitansi FINAL yang terhubung ke Invoice ini boleh diunduh');
        }
      }
    }

    if (!existsSync(document.storagePath)) throw new NotFoundException('File fisik tidak ditemukan di storage');

    return {
      file: new StreamableFile(createReadStream(document.storagePath)),
      document,
    };
  }
}
