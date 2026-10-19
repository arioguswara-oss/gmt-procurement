import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus, QuotationStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, PurchaseOrderItemInputDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const poInclude = Prisma.validator<Prisma.PurchaseOrderInclude>()({
  project: true,
  quotation: true,
  buyer: true,
  billTo: true,
  shipTo: true,
  receivingParty: true,
  buyerContact: true,
  items: {
    orderBy: { lineNo: 'asc' },
    include: { deliveryItems: { include: { deliveryOrder: { select: { id: true, doNo: true, status: true } } } } },
  },
  deliveryOrders: { orderBy: { doDate: 'asc' } },
  documents: true,
});

type PoWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogsService,
  ) {}

  private money(value: Prisma.Decimal | number | string) {
    return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private calculateItems(items: PurchaseOrderItemInputDto[]) {
    const rows = items.map((item, index) => ({
      ...item,
      lineNo: item.lineNo ?? index + 1,
      lineTotal: this.money(new Prisma.Decimal(item.qtyOrdered).mul(item.unitPrice)),
    }));
    const dup = rows.find((item, idx) => rows.findIndex((x) => x.lineNo === item.lineNo) !== idx);
    if (dup) throw new BadRequestException(`Line No ${dup.lineNo} duplikat`);
    const subtotal = this.money(rows.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0)));
    return { rows, subtotal };
  }

  private snapshot(partner: { companyName: string; npwp: string | null; email: string | null; phone: string | null; address: string | null; city: string | null; province: string | null; postalCode: string | null; country: string | null } | null | undefined) {
    if (!partner) return undefined;
    return {
      companyName: partner.companyName, npwp: partner.npwp, email: partner.email, phone: partner.phone,
      address: partner.address, city: partner.city, province: partner.province, postalCode: partner.postalCode, country: partner.country,
    };
  }

  async listByProject(projectId: bigint) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    return this.prisma.purchaseOrder.findMany({ where: { projectId }, include: poInclude, orderBy: { poDate: 'desc' } });
  }

  async get(id: bigint) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: poInclude });
    if (!po) throw new NotFoundException('Purchase Order tidak ditemukan');
    return po;
  }

  private async validateRelations(projectId: bigint, dto: CreatePurchaseOrderDto | UpdatePurchaseOrderDto) {
    if (dto.quotationId) {
      const quotation = await this.prisma.quotation.findFirst({ where: { id: BigInt(dto.quotationId), projectId } });
      if (!quotation) throw new BadRequestException('Quotation tidak berada pada project ini');
    }
    if (dto.buyerContactId && dto.buyerId) {
      const contact = await this.prisma.businessPartnerContact.findFirst({
        where: { id: BigInt(dto.buyerContactId), partnerId: BigInt(dto.buyerId) }, select: { id: true },
      });
      if (!contact) throw new BadRequestException('PIC buyer tidak sesuai dengan perusahaan buyer');
    }
  }

  async create(projectId: bigint, dto: CreatePurchaseOrderDto, userId: bigint) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    await this.validateRelations(projectId, dto);

    const buyerId = BigInt(dto.buyerId);
    const duplicate = await this.prisma.purchaseOrder.findFirst({ where: { buyerId, poNo: dto.poNo.trim() }, select: { id: true } });
    if (duplicate) throw new ConflictException('Nomor PO untuk buyer tersebut sudah terdaftar');

    const { rows, subtotal } = this.calculateItems(dto.items);
    const taxAmount = this.money(dto.taxAmount ?? 0);
    const grandTotal = dto.grandTotal !== undefined
      ? this.money(dto.grandTotal)
      : dto.taxIncluded ? subtotal : this.money(subtotal.plus(taxAmount));

    const [buyer, billTo, shipTo] = await Promise.all([
      this.prisma.businessPartner.findUnique({ where: { id: buyerId } }),
      dto.billToId ? this.prisma.businessPartner.findUnique({ where: { id: BigInt(dto.billToId) } }) : Promise.resolve(null),
      dto.shipToId ? this.prisma.businessPartner.findUnique({ where: { id: BigInt(dto.shipToId) } }) : Promise.resolve(null),
    ]);
    if (!buyer) throw new BadRequestException('Buyer tidak ditemukan');

    const po = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          projectId,
          quotationId: dto.quotationId ? BigInt(dto.quotationId) : undefined,
          poNo: dto.poNo.trim(),
          poDate: new Date(dto.poDate),
          buyerId,
          billToId: dto.billToId ? BigInt(dto.billToId) : undefined,
          shipToId: dto.shipToId ? BigInt(dto.shipToId) : undefined,
          receivingPartyId: dto.receivingPartyId ? BigInt(dto.receivingPartyId) : undefined,
          buyerContactId: dto.buyerContactId ? BigInt(dto.buyerContactId) : undefined,
          requestorName: dto.requestorName,
          prNo: dto.prNo,
          currency: (dto.currency ?? 'IDR').toUpperCase(),
          subtotal,
          taxIncluded: dto.taxIncluded ?? false,
          taxAmount,
          grandTotal,
          deliveryTerm: dto.deliveryTerm,
          paymentTerm: dto.paymentTerm,
          notes: dto.notes,
          status: dto.status ?? PurchaseOrderStatus.RECEIVED,
          buyerSnapshot: this.snapshot(buyer),
          billToSnapshot: this.snapshot(billTo),
          shipToSnapshot: this.snapshot(shipTo),
          createdById: userId,
          items: {
            create: rows.map((item) => ({
              lineNo: item.lineNo,
              description: item.description,
              partNumber: item.partNumber,
              manufacturer: item.manufacturer,
              model: item.model,
              qtyOrdered: item.qtyOrdered,
              uom: item.uom,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              notes: item.notes,
            })),
          },
        },
        include: poInclude,
      });

      if (dto.quotationId) {
        const quote = await tx.quotation.findUnique({ where: { id: BigInt(dto.quotationId) } });
        if (quote?.status === QuotationStatus.SENT) {
          await tx.quotation.update({ where: { id: quote.id }, data: { status: QuotationStatus.ACCEPTED, updatedById: userId } });
        }
      }
      return created;
    });

    await this.activity.write({ projectId, userId, action: 'CREATED', entityType: 'PURCHASE_ORDER', entityId: po.id, description: `Customer PO ${po.poNo} dicatat` });
    return this.get(po.id);
  }

  async update(id: bigint, dto: UpdatePurchaseOrderDto, userId: bigint) {
    const current = await this.get(id);
    if (current.deliveryOrders.length) throw new BadRequestException('PO yang sudah memiliki Delivery Order tidak boleh mengubah item. Koreksi melalui proses administrasi/override berikutnya.');
    await this.validateRelations(current.projectId, dto);

    const itemCalc = dto.items ? this.calculateItems(dto.items) : null;
    const subtotal = itemCalc?.subtotal ?? current.subtotal;
    const taxAmount = dto.taxAmount !== undefined ? this.money(dto.taxAmount) : current.taxAmount;
    const taxIncluded = dto.taxIncluded ?? current.taxIncluded;
    const grandTotal = dto.grandTotal !== undefined ? this.money(dto.grandTotal) : taxIncluded ? subtotal : this.money(subtotal.plus(taxAmount));

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items) await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          quotationId: dto.quotationId ? BigInt(dto.quotationId) : undefined,
          poNo: dto.poNo?.trim(),
          poDate: dto.poDate ? new Date(dto.poDate) : undefined,
          buyerId: dto.buyerId ? BigInt(dto.buyerId) : undefined,
          billToId: dto.billToId ? BigInt(dto.billToId) : undefined,
          shipToId: dto.shipToId ? BigInt(dto.shipToId) : undefined,
          receivingPartyId: dto.receivingPartyId ? BigInt(dto.receivingPartyId) : undefined,
          buyerContactId: dto.buyerContactId ? BigInt(dto.buyerContactId) : undefined,
          requestorName: dto.requestorName,
          prNo: dto.prNo,
          currency: dto.currency?.toUpperCase(),
          subtotal,
          taxIncluded,
          taxAmount,
          grandTotal,
          deliveryTerm: dto.deliveryTerm,
          paymentTerm: dto.paymentTerm,
          notes: dto.notes,
          status: dto.status,
          updatedById: userId,
          ...(itemCalc ? { items: { create: itemCalc.rows.map((item) => ({
            lineNo: item.lineNo, description: item.description, partNumber: item.partNumber,
            manufacturer: item.manufacturer, model: item.model, qtyOrdered: item.qtyOrdered,
            uom: item.uom, unitPrice: item.unitPrice, lineTotal: item.lineTotal, notes: item.notes,
          })) } } : {}),
        },
        include: poInclude,
      });
    });
    await this.activity.write({ projectId: current.projectId, userId, action: 'UPDATED', entityType: 'PURCHASE_ORDER', entityId: id, description: `Customer PO ${updated.poNo} diperbarui` });
    return updated;
  }
}
