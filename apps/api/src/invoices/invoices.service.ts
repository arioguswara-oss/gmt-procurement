import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryOrderStatus, DocumentType, InvoiceStatus, Prisma, TaxDocumentStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

const invoiceInclude = Prisma.validator<Prisma.InvoiceInclude>()({
  project: true,
  purchaseOrder: {
    include: {
      buyer: true,
      billTo: true,
      items: { orderBy: { lineNo: 'asc' } },
      documents: true,
    },
  },
  billTo: true,
  items: { include: { purchaseOrderItem: true } },
  deliveryLinks: {
    include: {
      deliveryOrder: {
        include: {
          documents: true,
          receivingDocuments: { include: { documents: true } },
        },
      },
    },
  },
  taxDocuments: { include: { documents: true } },
  receipt: { include: { documents: true } },
  payments: { include: { documents: true } },
  documents: true,
});

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: DocumentSequencesService,
    private readonly activity: ActivityLogsService,
  ) {}

  private async settingBoolean(key: string, fallback: boolean) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    return typeof setting?.value === 'boolean' ? setting.value : fallback;
  }

  private async invoiceTemplate() {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: 'INVOICE_NUMBER_TEMPLATE' } });
    return typeof setting?.value === 'string' ? setting.value : '{GMT_REF}/INV-{SEQ2}';
  }

  private async generateInvoiceNo(projectId: bigint, gmtReference: string) {
    const seq = await this.sequences.next('INVOICE', projectId.toString(), gmtReference);
    const template = await this.invoiceTemplate();
    return template
      .replaceAll('{GMT_REF}', gmtReference)
      .replaceAll('{SEQ}', String(seq))
      .replaceAll('{SEQ2}', String(seq).padStart(2, '0'))
      .replaceAll('{SEQ3}', String(seq).padStart(3, '0'));
  }

  private async companySnapshots() {
    const company = await this.prisma.companyProfile.findFirst({
      include: { bankAccounts: { where: { active: true }, orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] } },
    });
    if (!company) throw new BadRequestException('Company Profile belum diisi');
    const sellerSnapshot = {
      companyName: company.companyName,
      legalName: company.legalName,
      npwp: company.npwp,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      province: company.province,
      postalCode: company.postalCode,
      country: company.country,
    };
    const bank = company.bankAccounts[0];
    const bankSnapshot = bank ? {
      bankName: bank.bankName,
      branchName: bank.branchName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      swiftCode: bank.swiftCode,
      currency: bank.currency,
    } : null;
    const signatorySnapshot = { name: company.defaultSignatoryName, title: company.defaultSignatoryTitle };
    return { sellerSnapshot, bankSnapshot, signatorySnapshot };
  }

  private partnerSnapshot(partner: {
    companyName: string; npwp: string | null; email: string | null; phone: string | null; address: string | null;
    city: string | null; province: string | null; postalCode: string | null; country: string | null;
  }) {
    return {
      companyName: partner.companyName, npwp: partner.npwp, email: partner.email, phone: partner.phone,
      address: partner.address, city: partner.city, province: partner.province, postalCode: partner.postalCode, country: partner.country,
    };
  }

  async listByProject(projectId: bigint) {
    return this.prisma.invoice.findMany({ where: { projectId }, include: invoiceInclude, orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }] });
  }

  async get(id: bigint): Promise<InvoiceWithRelations> {
    const row = await this.prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
    if (!row) throw new NotFoundException('Invoice tidak ditemukan');
    return row;
  }

  private aggregateSelectedDeliveryItems(deliveryOrders: Array<{
    items: Array<{ purchaseOrderItemId: bigint; qtyDelivered: Prisma.Decimal }>;
  }>) {
    const result = new Map<string, Prisma.Decimal>();
    for (const delivery of deliveryOrders) {
      for (const item of delivery.items) {
        const key = item.purchaseOrderItemId.toString();
        result.set(key, (result.get(key) ?? new Prisma.Decimal(0)).plus(item.qtyDelivered));
      }
    }
    return result;
  }

  async create(purchaseOrderId: bigint, dto: CreateInvoiceDto, userId: bigint) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        project: true,
        buyer: true,
        billTo: true,
        items: { orderBy: { lineNo: 'asc' } },
        invoices: { where: { status: { not: InvoiceStatus.CANCELLED } }, select: { id: true, invoiceNo: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase Order tidak ditemukan');

    const ids = [...new Set(dto.deliveryOrderIds.map((value) => BigInt(value)))];
    if (!ids.length) throw new BadRequestException('Pilih minimal satu Delivery Order yang sudah diterima');

    const deliveryOrders = await this.prisma.deliveryOrder.findMany({
      where: { id: { in: ids } },
      include: {
        items: true,
        documents: true,
        receivingDocuments: { include: { documents: true } },
        invoiceLinks: { include: { invoice: { select: { id: true, invoiceNo: true, status: true } } } },
      },
    });
    if (deliveryOrders.length !== ids.length) throw new BadRequestException('Salah satu Delivery Order tidak ditemukan');
    if (deliveryOrders.some((row) => row.purchaseOrderId !== purchaseOrderId)) {
      throw new BadRequestException('Semua Delivery Order harus berasal dari Purchase Order yang sama');
    }
    if (deliveryOrders.some((row) => row.status !== DeliveryOrderStatus.RECEIVED)) {
      throw new BadRequestException('Invoice hanya boleh mengambil Delivery Order berstatus RECEIVED');
    }
    const missingEvidence = deliveryOrders.find((row) => {
      const direct = row.documents.some((doc) => doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT);
      const nested = row.receivingDocuments.some((receiving) =>
        receiving.documents.some((doc) => doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT),
      );
      return !direct && !nested;
    });
    if (missingEvidence) throw new BadRequestException(`Delivery Order ${missingEvidence.doNo} belum memiliki Signed DO / Receiving Evidence`);

    const alreadyInvoiced = deliveryOrders.find((row) => row.invoiceLinks.some((link) => link.invoice.status !== InvoiceStatus.CANCELLED));
    if (alreadyInvoiced) throw new BadRequestException(`Delivery Order ${alreadyInvoiced.doNo} sudah digunakan pada invoice aktif`);

    const allowPartial = await this.settingBoolean('ALLOW_PARTIAL_INVOICE', false);
    if (!allowPartial && po.invoices.length) {
      throw new BadRequestException('Partial/multiple invoice dinonaktifkan dan PO ini sudah mempunyai invoice aktif');
    }

    const selectedQty = this.aggregateSelectedDeliveryItems(deliveryOrders);
    if (!allowPartial) {
      const incomplete = po.items.find((item) => !new Prisma.Decimal(selectedQty.get(item.id.toString()) ?? 0).equals(item.qtyOrdered));
      if (incomplete) {
        throw new BadRequestException(`Partial invoice dinonaktifkan. Qty received untuk ${incomplete.description} belum sama dengan Qty PO`);
      }
    }

    const billToId = dto.billToId ? BigInt(dto.billToId) : (po.billToId ?? po.buyerId);
    const billTo = await this.prisma.businessPartner.findUnique({ where: { id: billToId } });
    if (!billTo) throw new BadRequestException('Bill To tidak ditemukan');

    const itemRows = po.items
      .map((item) => {
        const qty = selectedQty.get(item.id.toString()) ?? new Prisma.Decimal(0);
        return { item, qty };
      })
      .filter((row) => row.qty.greaterThan(0));
    if (!itemRows.length) throw new BadRequestException('Tidak ada quantity RECEIVED yang dapat ditagihkan');

    const subtotal = itemRows.reduce((sum, row) => sum.plus(row.qty.mul(row.item.unitPrice)), new Prisma.Decimal(0));
    const taxBase = dto.taxBase !== undefined ? new Prisma.Decimal(dto.taxBase) : subtotal;
    const taxRate = dto.taxRate !== undefined ? new Prisma.Decimal(dto.taxRate) : null;
    const taxAmount = dto.taxAmount !== undefined
      ? new Prisma.Decimal(dto.taxAmount)
      : (taxRate ? taxBase.mul(taxRate).div(100).toDecimalPlaces(2) : new Prisma.Decimal(0));
    const grandTotal = subtotal.plus(taxAmount);
    const invoiceNo = await this.generateInvoiceNo(po.projectId, po.project.gmtReference);

    const row = await this.prisma.invoice.create({
      data: {
        projectId: po.projectId,
        purchaseOrderId,
        invoiceNo,
        invoiceDate: new Date(dto.invoiceDate),
        status: InvoiceStatus.DRAFT,
        billToId,
        currency: dto.currency ?? po.currency,
        subtotal,
        taxScheme: dto.taxScheme,
        taxRate,
        taxBase,
        taxAmount,
        grandTotal,
        paymentTerm: dto.paymentTerm ?? po.paymentTerm,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById: userId,
        billToSnapshot: this.partnerSnapshot(billTo),
        items: {
          create: itemRows.map(({ item, qty }) => ({
            purchaseOrderItemId: item.id,
            description: item.description,
            qty,
            uom: item.uom,
            unitPrice: item.unitPrice,
            lineTotal: qty.mul(item.unitPrice),
          })),
        },
        deliveryLinks: { create: deliveryOrders.map((delivery) => ({ deliveryOrderId: delivery.id })) },
      },
      include: invoiceInclude,
    });

    await this.activity.write({
      projectId: po.projectId,
      userId,
      action: 'CREATED',
      entityType: 'INVOICE',
      entityId: row.id,
      description: `Draft Invoice ${row.invoiceNo} dibuat dari ${deliveryOrders.length} DO RECEIVED`,
    });
    return row;
  }

  async submitForTax(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status !== InvoiceStatus.DRAFT) throw new BadRequestException('Hanya invoice DRAFT yang dapat dikirim ke tahap Faktur Pajak');
    const row = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.WAITING_TAX_INVOICE, updatedById: userId },
      include: invoiceInclude,
    });
    await this.activity.write({
      projectId: current.projectId, userId, action: 'SUBMITTED_FOR_TAX', entityType: 'INVOICE', entityId: id,
      description: `Invoice ${row.invoiceNo} dikunci dan menunggu Faktur Pajak Coretax`,
    });
    return row;
  }

  async finalize(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status === InvoiceStatus.FINAL) return current;
    if (current.status === InvoiceStatus.CANCELLED) throw new BadRequestException('Invoice sudah dibatalkan');

    const requireTax = await this.settingBoolean('REQUIRE_TAX_INVOICE_BEFORE_FINAL_INVOICE', true);
    const activeTax = current.taxDocuments.filter((tax) => tax.status !== TaxDocumentStatus.CANCELLED && tax.documents.some((doc) => doc.documentType === DocumentType.TAX_INVOICE));
    if (requireTax && !activeTax.length) throw new BadRequestException('Upload Faktur Pajak Coretax terlebih dahulu');
    if (requireTax && current.status !== InvoiceStatus.READY_TO_FINALIZE) {
      throw new BadRequestException('Invoice belum READY_TO_FINALIZE');
    }

    const snapshots = await this.companySnapshots();
    const row = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.FINAL,
        sellerSnapshot: snapshots.sellerSnapshot,
        bankSnapshot: snapshots.bankSnapshot ?? undefined,
        signatorySnapshot: snapshots.signatorySnapshot,
        finalizedAt: new Date(),
        updatedById: userId,
      },
      include: invoiceInclude,
    });
    await this.activity.write({
      projectId: current.projectId, userId, action: 'FINALIZED', entityType: 'INVOICE', entityId: id,
      description: `Invoice ${row.invoiceNo} difinalkan`,
    });
    return row;
  }

  async cancel(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status === InvoiceStatus.FINAL && current.payments.length) {
      throw new BadRequestException('Invoice yang sudah memiliki payment tidak dapat dibatalkan');
    }
    if (current.status === InvoiceStatus.CANCELLED) return current;
    const row = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED, updatedById: userId },
      include: invoiceInclude,
    });
    await this.activity.write({
      projectId: current.projectId, userId, action: 'CANCELLED', entityType: 'INVOICE', entityId: id,
      description: `Invoice ${row.invoiceNo} dibatalkan`,
    });
    return row;
  }

  async billingPackageManifest(id: bigint) {
    const row = await this.get(id);
    const poFiles = row.purchaseOrder.documents.filter((doc) => doc.documentType === DocumentType.ORIGINAL_PO);
    const receivingFiles = row.deliveryLinks.flatMap((link) => [
      ...link.deliveryOrder.documents.filter((doc) => doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT),
      ...link.deliveryOrder.receivingDocuments.flatMap((receiving) =>
        receiving.documents.filter((doc) => doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT),
      ),
    ]);
    const taxFiles = row.taxDocuments.flatMap((tax) => tax.documents.filter((doc) => doc.documentType === DocumentType.TAX_INVOICE));
    const receiptFiles = row.receipt?.documents.filter((doc) => doc.documentType === DocumentType.RECEIPT_PDF) ?? [];

    return {
      invoiceId: row.id,
      invoiceNo: row.invoiceNo,
      status: row.status,
      order: ['INVOICE', 'ORIGINAL_PO', 'SIGNED_DO_OR_RECEIVING', 'TAX_INVOICE', 'RECEIPT'],
      files: { po: poFiles, receiving: receivingFiles, taxInvoice: taxFiles, receipt: receiptFiles },
      note: 'Manifest siap untuk PDF merge engine pada milestone berikutnya. Preview Invoice A4 tersedia sekarang.',
    };
  }
}
