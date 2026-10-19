import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuotationDto, QuotationItemInputDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

const quotationInclude = Prisma.validator<Prisma.QuotationInclude>()({
  project: { include: { origin: true } },
  customer: true,
  customerContact: true,
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  items: { orderBy: { lineNo: 'asc' } },
  documents: true,
});

type QuotationWithRelations = Prisma.QuotationGetPayload<{ include: typeof quotationInclude }>;

type CalculatedQuotation = {
  subtotal: Prisma.Decimal;
  discountRate: Prisma.Decimal | null;
  discountAmount: Prisma.Decimal;
  taxRate: Prisma.Decimal | null;
  taxBase: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  items: Array<QuotationItemInputDto & { lineNo: number; lineTotal: Prisma.Decimal }>;
};

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogsService,
  ) {}

  private money(value: Prisma.Decimal | number | string) {
    return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private percent(value: number | undefined) {
    return value === undefined ? null : new Prisma.Decimal(value);
  }

  private calculate(dto: CreateQuotationDto | UpdateQuotationDto, fallback?: QuotationWithRelations): CalculatedQuotation {
    const sourceItems = dto.items ?? fallback?.items.map((item) => ({
      lineNo: item.lineNo,
      description: item.description,
      partNumber: item.partNumber ?? undefined,
      manufacturer: item.manufacturer ?? undefined,
      model: item.model ?? undefined,
      origin: item.origin ?? undefined,
      qty: Number(item.qty),
      uom: item.uom,
      unitPrice: Number(item.unitPrice),
      notes: item.notes ?? undefined,
    }));

    if (!sourceItems?.length) throw new BadRequestException('Quotation minimal memiliki satu item');

    const items = sourceItems.map((item, index) => {
      const qty = new Prisma.Decimal(item.qty);
      const unitPrice = this.money(item.unitPrice);
      const lineTotal = this.money(qty.mul(unitPrice));
      return { ...item, lineNo: item.lineNo ?? index + 1, lineTotal };
    });

    const duplicateLine = items.find((item, idx) => items.findIndex((x) => x.lineNo === item.lineNo) !== idx);
    if (duplicateLine) throw new BadRequestException(`Line No ${duplicateLine.lineNo} duplikat`);

    const subtotal = this.money(items.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0)));

    const discountRate = dto.discountRate !== undefined
      ? this.percent(dto.discountRate)
      : fallback?.discountRate ?? null;
    let discountAmount: Prisma.Decimal;
    if (dto.discountAmount !== undefined) {
      discountAmount = this.money(dto.discountAmount);
    } else if (dto.discountRate !== undefined) {
      discountAmount = this.money(subtotal.mul(dto.discountRate).div(100));
    } else if (fallback) {
      discountAmount = fallback.discountRate
        ? this.money(subtotal.mul(fallback.discountRate).div(100))
        : this.money(fallback.discountAmount);
    } else {
      discountAmount = new Prisma.Decimal(0);
    }

    if (discountAmount.greaterThan(subtotal)) throw new BadRequestException('Discount tidak boleh melebihi subtotal');
    const afterDiscount = this.money(subtotal.minus(discountAmount));

    const taxRate = dto.taxRate !== undefined ? this.percent(dto.taxRate) : fallback?.taxRate ?? null;
    const taxBase = dto.taxBase !== undefined
      ? this.money(dto.taxBase)
      : dto.items !== undefined || dto.discountAmount !== undefined || dto.discountRate !== undefined
        ? afterDiscount
        : fallback?.taxBase ?? afterDiscount;
    const taxAmount = taxRate ? this.money(taxBase.mul(taxRate).div(100)) : new Prisma.Decimal(0);
    const grandTotal = this.money(afterDiscount.plus(taxAmount));

    return { subtotal, discountRate, discountAmount, taxRate, taxBase, taxAmount, grandTotal, items };
  }

  private async validateCustomerContact(customerId: bigint, contactId?: string) {
    if (!contactId) return;
    const contact = await this.prisma.businessPartnerContact.findFirst({
      where: { id: BigInt(contactId), partnerId: customerId, active: true },
      select: { id: true },
    });
    if (!contact) throw new BadRequestException('PIC customer tidak berada pada customer project ini');
  }

  private async defaultValidUntil(quotationDate: Date) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: 'DEFAULT_QUOTATION_VALID_DAYS' } });
    const raw = setting?.value;
    const days = typeof raw === 'number' ? raw : 30;
    const result = new Date(quotationDate);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  async listByProject(projectId: bigint) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    return this.prisma.quotation.findMany({
      where: { projectId },
      include: quotationInclude,
      orderBy: [{ quotationNo: 'asc' }, { revisionNo: 'desc' }],
    });
  }

  async get(id: bigint) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id }, include: quotationInclude });
    if (!quotation) throw new NotFoundException('Quotation tidak ditemukan');
    return quotation;
  }

  async create(projectId: bigint, dto: CreateQuotationDto, userId: bigint) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { customer: true, origin: true },
    });
    if (!project) throw new NotFoundException('Project tidak ditemukan');

    const existing = await this.prisma.quotation.findFirst({ where: { projectId } });
    if (existing) throw new ConflictException('Project sudah memiliki quotation. Gunakan fitur revisi untuk membuat versi berikutnya.');

    await this.validateCustomerContact(project.customerId, dto.customerContactId);
    const calculated = this.calculate(dto);
    const quotationDate = new Date(dto.quotationDate);
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : await this.defaultValidUntil(quotationDate);

    const quotation = await this.prisma.$transaction(async (tx) => {
      return tx.quotation.create({
        data: {
          projectId,
          quotationNo: project.gmtReference,
          revisionNo: 0,
          quotationDate,
          validUntil,
          rfqNo: dto.rfqNo ?? project.origin?.externalReference,
          customerId: project.customerId,
          customerContactId: dto.customerContactId ? BigInt(dto.customerContactId) : undefined,
          subject: dto.subject ?? project.projectName,
          currency: (dto.currency ?? 'IDR').toUpperCase(),
          subtotal: calculated.subtotal,
          discountRate: calculated.discountRate,
          discountAmount: calculated.discountAmount,
          taxScheme: dto.taxScheme ?? 'STANDARD',
          taxRate: calculated.taxRate,
          taxBase: calculated.taxBase,
          taxAmount: calculated.taxAmount,
          grandTotal: calculated.grandTotal,
          deliveryTerm: dto.deliveryTerm,
          deliveryTime: dto.deliveryTime,
          paymentTerm: dto.paymentTerm,
          certificateTerm: dto.certificateTerm,
          additionalNotes: dto.additionalNotes,
          createdById: userId,
          items: {
            create: calculated.items.map((item) => ({
              lineNo: item.lineNo,
              description: item.description,
              partNumber: item.partNumber,
              manufacturer: item.manufacturer,
              model: item.model,
              origin: item.origin,
              qty: item.qty,
              uom: item.uom,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              notes: item.notes,
            })),
          },
        },
        include: quotationInclude,
      });
    });

    await this.activity.write({
      projectId,
      userId,
      action: 'CREATED',
      entityType: 'QUOTATION',
      entityId: quotation.id,
      description: `Quotation ${quotation.quotationNo} Rev.${quotation.revisionNo} dibuat`,
    });
    return quotation;
  }

  async update(id: bigint, dto: UpdateQuotationDto, userId: bigint) {
    const current = await this.get(id);
    if (current.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Quotation yang sudah dikirim/final tidak boleh diedit. Buat revisi baru.');
    }

    const customerContactId = dto.customerContactId !== undefined
      ? (dto.customerContactId ? BigInt(dto.customerContactId) : null)
      : undefined;
    if (dto.customerContactId) await this.validateCustomerContact(current.customerId, dto.customerContactId);

    const calculated = this.calculate(dto, current);
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize a draft edit against concurrent Mark Sent/revision changes.
      // This conditional write acquires the row lock before touching child items.
      const claimed = await tx.quotation.updateMany({
        where: { id, status: QuotationStatus.DRAFT },
        data: { updatedById: userId },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Quotation sudah dikirim/final; perubahan draft ditolak. Gunakan revisi.');
      }
      if (dto.items) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      }

      return tx.quotation.update({
        where: { id },
        data: {
          quotationDate: dto.quotationDate ? new Date(dto.quotationDate) : undefined,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          rfqNo: dto.rfqNo,
          customerContactId,
          subject: dto.subject,
          currency: dto.currency?.toUpperCase(),
          subtotal: calculated.subtotal,
          discountRate: calculated.discountRate,
          discountAmount: calculated.discountAmount,
          taxScheme: dto.taxScheme,
          taxRate: calculated.taxRate,
          taxBase: calculated.taxBase,
          taxAmount: calculated.taxAmount,
          grandTotal: calculated.grandTotal,
          deliveryTerm: dto.deliveryTerm,
          deliveryTime: dto.deliveryTime,
          paymentTerm: dto.paymentTerm,
          certificateTerm: dto.certificateTerm,
          additionalNotes: dto.additionalNotes,
          updatedById: userId,
          ...(dto.items ? {
            items: {
              create: calculated.items.map((item) => ({
                lineNo: item.lineNo,
                description: item.description,
                partNumber: item.partNumber,
                manufacturer: item.manufacturer,
                model: item.model,
                origin: item.origin,
                qty: item.qty,
                uom: item.uom,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
                notes: item.notes,
              })),
            },
          } : {}),
        },
        include: quotationInclude,
      });
    });

    await this.activity.write({
      projectId: current.projectId,
      userId,
      action: 'UPDATED',
      entityType: 'QUOTATION',
      entityId: id,
      description: `Quotation ${current.quotationNo} Rev.${current.revisionNo} diperbarui`,
    });
    return result;
  }

  private customerSnapshot(customer: QuotationWithRelations['customer']) {
    return {
      companyName: customer.companyName,
      npwp: customer.npwp,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      province: customer.province,
      postalCode: customer.postalCode,
      country: customer.country,
    };
  }

  private async sellerSnapshot() {
    const company = await this.prisma.companyProfile.findFirst();
    if (!company) throw new BadRequestException('Company Profile PT Gayuh Mandala Teknika belum diisi');
    return {
      seller: {
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
      },
      signatory: {
        name: company.defaultSignatoryName,
        title: company.defaultSignatoryTitle,
      },
    };
  }

  async send(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status !== QuotationStatus.DRAFT) throw new BadRequestException('Hanya quotation DRAFT yang dapat dikirim');
    if (!current.items.length) throw new BadRequestException('Quotation belum memiliki item');

    const snapshots = await this.sellerSnapshot();
    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.SENT,
        sellerSnapshot: snapshots.seller,
        customerSnapshot: this.customerSnapshot(current.customer),
        signatorySnapshot: snapshots.signatory,
        finalizedAt: new Date(),
        updatedById: userId,
      },
      include: quotationInclude,
    });

    await this.activity.write({
      projectId: current.projectId,
      userId,
      action: 'SENT',
      entityType: 'QUOTATION',
      entityId: id,
      description: `Quotation ${current.quotationNo} Rev.${current.revisionNo} ditandai SENT`,
    });
    return quotation;
  }

  async revise(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status !== QuotationStatus.SENT && current.status !== QuotationStatus.ACCEPTED && current.status !== QuotationStatus.REJECTED) {
      throw new BadRequestException('Quotation harus pernah dikirim sebelum dibuat revisi');
    }

    const nextRevision = current.revisionNo + 1;
    const revisionDate = new Date();
    const revisionValidUntil = await this.defaultValidUntil(revisionDate);
    const revised = await this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({ where: { id }, data: { status: QuotationStatus.SUPERSEDED, updatedById: userId } });
      return tx.quotation.create({
        data: {
          projectId: current.projectId,
          quotationNo: current.quotationNo,
          revisionNo: nextRevision,
          supersedesId: current.id,
          quotationDate: revisionDate,
          validUntil: revisionValidUntil,
          rfqNo: current.rfqNo,
          status: QuotationStatus.DRAFT,
          customerId: current.customerId,
          customerContactId: current.customerContactId,
          subject: current.subject,
          currency: current.currency,
          subtotal: current.subtotal,
          discountRate: current.discountRate,
          discountAmount: current.discountAmount,
          taxScheme: current.taxScheme,
          taxRate: current.taxRate,
          taxBase: current.taxBase,
          taxAmount: current.taxAmount,
          grandTotal: current.grandTotal,
          deliveryTerm: current.deliveryTerm,
          deliveryTime: current.deliveryTime,
          paymentTerm: current.paymentTerm,
          certificateTerm: current.certificateTerm,
          additionalNotes: current.additionalNotes,
          createdById: userId,
          items: {
            create: current.items.map((item) => ({
              lineNo: item.lineNo,
              description: item.description,
              partNumber: item.partNumber,
              manufacturer: item.manufacturer,
              model: item.model,
              origin: item.origin,
              qty: item.qty,
              uom: item.uom,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              notes: item.notes,
            })),
          },
        },
        include: quotationInclude,
      });
    });

    await this.activity.write({
      projectId: current.projectId,
      userId,
      action: 'REVISED',
      entityType: 'QUOTATION',
      entityId: revised.id,
      description: `Quotation ${current.quotationNo} Rev.${nextRevision} dibuat dari Rev.${current.revisionNo}`,
    });
    return revised;
  }

  async setDecision(id: bigint, decision: 'ACCEPTED' | 'REJECTED', userId: bigint) {
    const current = await this.get(id);
    if (current.status !== QuotationStatus.SENT) throw new BadRequestException('Keputusan hanya dapat dicatat pada quotation SENT');
    const status = decision === 'ACCEPTED' ? QuotationStatus.ACCEPTED : QuotationStatus.REJECTED;
    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: { status, updatedById: userId },
      include: quotationInclude,
    });
    await this.activity.write({
      projectId: current.projectId,
      userId,
      action: decision,
      entityType: 'QUOTATION',
      entityId: id,
      description: `Quotation ${current.quotationNo} Rev.${current.revisionNo} ${decision}`,
    });
    return quotation;
  }

  async cancel(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status === QuotationStatus.SUPERSEDED || current.status === QuotationStatus.CANCELLED) {
      throw new BadRequestException('Quotation sudah tidak aktif');
    }
    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.CANCELLED, updatedById: userId },
      include: quotationInclude,
    });
    await this.activity.write({
      projectId: current.projectId,
      userId,
      action: 'CANCELLED',
      entityType: 'QUOTATION',
      entityId: id,
      description: `Quotation ${current.quotationNo} Rev.${current.revisionNo} dibatalkan`,
    });
    return quotation;
  }
}
