import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryOrderStatus, DocumentType, Prisma } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryOrderDto, DeliveryOrderItemInputDto } from './dto/create-delivery-order.dto';
import { UpdateDeliveryOrderDto } from './dto/update-delivery-order.dto';

const doInclude = Prisma.validator<Prisma.DeliveryOrderInclude>()({
  purchaseOrder: {
    include: {
      project: true,
      buyer: true,
      shipTo: true,
      receivingParty: true,
      items: { orderBy: { lineNo: 'asc' } },
    },
  },
  items: { include: { purchaseOrderItem: true } },
  receivingDocuments: true,
  documents: true,
});

type DoWithRelations = Prisma.DeliveryOrderGetPayload<{ include: typeof doInclude }>;

type PoForDelivery = Prisma.PurchaseOrderGetPayload<{
  include: {
    project: true;
    buyer: true;
    shipTo: true;
    receivingParty: true;
    items: { include: { deliveryItems: { include: { deliveryOrder: true } } } };
  };
}>;

@Injectable()
export class DeliveryOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: DocumentSequencesService,
    private readonly activity: ActivityLogsService,
  ) {}

  private async template() {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: 'DO_NUMBER_TEMPLATE' } });
    return typeof setting?.value === 'string' ? setting.value : '{GMT_REF}/DO-{SEQ2}';
  }

  private async generateDoNo(projectId: bigint, gmtReference: string) {
    const seq = await this.sequences.next('DELIVERY_ORDER', projectId.toString(), gmtReference);
    const template = await this.template();
    return template
      .replaceAll('{GMT_REF}', gmtReference)
      .replaceAll('{SEQ}', String(seq))
      .replaceAll('{SEQ2}', String(seq).padStart(2, '0'))
      .replaceAll('{SEQ3}', String(seq).padStart(3, '0'));
  }

  private receiverSnapshot(po: PoForDelivery) {
    const target = po.receivingParty ?? po.shipTo ?? po.buyer;
    return {
      companyName: target.companyName,
      email: target.email,
      phone: target.phone,
      address: target.address,
      city: target.city,
      province: target.province,
      postalCode: target.postalCode,
      country: target.country,
    };
  }

  private async sellerSnapshot() {
    const company = await this.prisma.companyProfile.findFirst();
    if (!company) throw new BadRequestException('Company Profile belum diisi');
    return {
      companyName: company.companyName,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      province: company.province,
      postalCode: company.postalCode,
      country: company.country,
    };
  }

  private async poForDelivery(purchaseOrderId: bigint): Promise<PoForDelivery> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        project: true,
        buyer: true,
        shipTo: true,
        receivingParty: true,
        items: { include: { deliveryItems: { include: { deliveryOrder: true } } } },
      },
    });
    if (!po) throw new NotFoundException('Purchase Order tidak ditemukan');
    return po;
  }

  private validateItems(po: PoForDelivery, input: DeliveryOrderItemInputDto[], excludeDoId?: bigint) {
    const duplicate = input.find((row, idx) => input.findIndex((x) => x.purchaseOrderItemId === row.purchaseOrderItemId) !== idx);
    if (duplicate) throw new BadRequestException('Item PO yang sama tidak boleh muncul dua kali pada satu DO');

    return input.map((row) => {
      const item = po.items.find((x) => x.id === BigInt(row.purchaseOrderItemId));
      if (!item) throw new BadRequestException(`PO item ${row.purchaseOrderItemId} tidak berada pada PO ini`);

      const allocated = item.deliveryItems
        .filter((link) => link.deliveryOrder.id !== excludeDoId && link.deliveryOrder.status !== DeliveryOrderStatus.CANCELLED)
        .reduce((sum, link) => sum.plus(link.qtyDelivered), new Prisma.Decimal(0));
      const qty = new Prisma.Decimal(row.qtyDelivered);
      const remaining = item.qtyOrdered.minus(allocated);
      if (qty.greaterThan(remaining)) {
        throw new BadRequestException(`Qty ${item.description} melebihi balance PO. Balance tersedia: ${remaining.toString()}`);
      }
      return { purchaseOrderItemId: item.id, qtyDelivered: qty, notes: row.notes };
    });
  }

  async listByPurchaseOrder(purchaseOrderId: bigint) {
    await this.poForDelivery(purchaseOrderId);
    return this.prisma.deliveryOrder.findMany({ where: { purchaseOrderId }, include: doInclude, orderBy: [{ doDate: 'asc' }, { id: 'asc' }] });
  }

  async get(id: bigint) {
    const row = await this.prisma.deliveryOrder.findUnique({ where: { id }, include: doInclude });
    if (!row) throw new NotFoundException('Delivery Order tidak ditemukan');
    return row;
  }

  async create(purchaseOrderId: bigint, dto: CreateDeliveryOrderDto, userId: bigint) {
    const po = await this.poForDelivery(purchaseOrderId);
    const items = this.validateItems(po, dto.items);
    const doNo = await this.generateDoNo(po.projectId, po.project.gmtReference);

    const row = await this.prisma.deliveryOrder.create({
      data: {
        purchaseOrderId,
        doNo,
        doDate: new Date(dto.doDate),
        status: DeliveryOrderStatus.DRAFT,
        deliveryAddress: dto.deliveryAddress ?? po.shipTo?.address ?? po.receivingParty?.address,
        deliveryContact: dto.deliveryContact,
        vehicleNo: dto.vehicleNo,
        driverName: dto.driverName,
        notes: dto.notes,
        createdById: userId,
        items: { create: items },
      },
      include: doInclude,
    });

    await this.activity.write({ projectId: po.projectId, userId, action: 'CREATED', entityType: 'DELIVERY_ORDER', entityId: row.id, description: `Delivery Order ${row.doNo} dibuat (DRAFT)` });
    return row;
  }

  async update(id: bigint, dto: UpdateDeliveryOrderDto, userId: bigint) {
    const current = await this.get(id);
    if (current.status !== DeliveryOrderStatus.DRAFT) throw new BadRequestException('Hanya DO DRAFT yang dapat diedit');
    const po = await this.poForDelivery(current.purchaseOrderId);
    const items = dto.items ? this.validateItems(po, dto.items, id) : null;

    const row = await this.prisma.$transaction(async (tx) => {
      if (items) await tx.deliveryOrderItem.deleteMany({ where: { deliveryOrderId: id } });
      return tx.deliveryOrder.update({
        where: { id },
        data: {
          doDate: dto.doDate ? new Date(dto.doDate) : undefined,
          deliveryAddress: dto.deliveryAddress,
          deliveryContact: dto.deliveryContact,
          vehicleNo: dto.vehicleNo,
          driverName: dto.driverName,
          notes: dto.notes,
          updatedById: userId,
          ...(items ? { items: { create: items } } : {}),
        },
        include: doInclude,
      });
    });
    await this.activity.write({ projectId: po.projectId, userId, action: 'UPDATED', entityType: 'DELIVERY_ORDER', entityId: id, description: `Delivery Order ${row.doNo} diperbarui` });
    return row;
  }

  async issue(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status !== DeliveryOrderStatus.DRAFT) throw new BadRequestException('Hanya DO DRAFT yang dapat di-issue');
    if (!current.items.length) throw new BadRequestException('DO belum memiliki item yang dikirim');
    const po = await this.poForDelivery(current.purchaseOrderId);
    const originalPoCount = await this.prisma.document.count({
      where: { purchaseOrderId: current.purchaseOrderId, documentType: DocumentType.ORIGINAL_PO },
    });
    if (!originalPoCount) {
      throw new BadRequestException('Upload Original Customer PO terlebih dahulu sebelum Delivery Order di-issue');
    }

    // Re-check balance immediately before finalizing to guard against parallel/new DOs.
    this.validateItems(po, current.items.map((item) => ({
      purchaseOrderItemId: item.purchaseOrderItemId.toString(),
      qtyDelivered: Number(item.qtyDelivered),
      notes: item.notes ?? undefined,
    })), id);

    const row = await this.prisma.deliveryOrder.update({
      where: { id },
      data: {
        status: DeliveryOrderStatus.ISSUED,
        sellerSnapshot: await this.sellerSnapshot(),
        receiverSnapshot: this.receiverSnapshot(po),
        updatedById: userId,
      },
      include: doInclude,
    });
    await this.activity.write({ projectId: po.projectId, userId, action: 'ISSUED', entityType: 'DELIVERY_ORDER', entityId: id, description: `Delivery Order ${row.doNo} di-issue` });
    return row;
  }

  async markReceived(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status !== DeliveryOrderStatus.ISSUED && current.status !== DeliveryOrderStatus.AWAITING_RECEIPT) {
      throw new BadRequestException('DO belum berada pada tahap pengiriman/menunggu penerimaan');
    }

    const evidence = await this.prisma.document.count({
      where: {
        OR: [
          { deliveryOrderId: id, documentType: { in: [DocumentType.SIGNED_DO, DocumentType.RECEIVING_DOCUMENT] } },
          { receivingDocument: { deliveryOrderId: id }, documentType: { in: [DocumentType.SIGNED_DO, DocumentType.RECEIVING_DOCUMENT] } },
        ],
      },
    });
    if (!evidence) {
      throw new BadRequestException('Upload Signed DO atau Receiving Document terlebih dahulu sebelum DO ditandai RECEIVED');
    }

    const row = await this.prisma.deliveryOrder.update({
      where: { id },
      data: { status: DeliveryOrderStatus.RECEIVED, receivedAt: new Date(), updatedById: userId },
      include: doInclude,
    });
    await this.activity.write({ projectId: current.purchaseOrder.projectId, userId, action: 'RECEIVED', entityType: 'DELIVERY_ORDER', entityId: id, description: `Delivery Order ${row.doNo} diterima dengan receiving evidence` });
    return row;
  }

  async cancel(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status === DeliveryOrderStatus.RECEIVED) throw new BadRequestException('DO yang sudah RECEIVED tidak boleh dibatalkan langsung');
    if (current.status === DeliveryOrderStatus.CANCELLED) return current;
    const row = await this.prisma.deliveryOrder.update({ where: { id }, data: { status: DeliveryOrderStatus.CANCELLED, updatedById: userId }, include: doInclude });
    await this.activity.write({ projectId: current.purchaseOrder.projectId, userId, action: 'CANCELLED', entityType: 'DELIVERY_ORDER', entityId: id, description: `Delivery Order ${row.doNo} dibatalkan` });
    return row;
  }

  async deliveryMatrix(id: bigint) {
    const current = await this.get(id);
    const po = await this.poForDelivery(current.purchaseOrderId);
    const activeForHistory = new Set<DeliveryOrderStatus>([DeliveryOrderStatus.ISSUED, DeliveryOrderStatus.AWAITING_RECEIPT, DeliveryOrderStatus.RECEIVED]);

    return po.items.map((item) => {
      const currentLine = current.items.find((x) => x.purchaseOrderItemId === item.id);
      const previous = item.deliveryItems
        .filter((link) => link.deliveryOrder.id !== id && activeForHistory.has(link.deliveryOrder.status))
        .reduce((sum, link) => sum.plus(link.qtyDelivered), new Prisma.Decimal(0));
      const thisDo = currentLine?.qtyDelivered ?? new Prisma.Decimal(0);
      return {
        purchaseOrderItemId: item.id,
        lineNo: item.lineNo,
        description: item.description,
        partNumber: item.partNumber,
        manufacturer: item.manufacturer,
        qtyOrdered: item.qtyOrdered,
        uom: item.uom,
        previouslyDelivered: previous,
        thisDelivery: thisDo,
        balanceAfterThisDo: item.qtyOrdered.minus(previous).minus(thisDo),
        marked: thisDo.greaterThan(0),
      };
    });
  }
}
