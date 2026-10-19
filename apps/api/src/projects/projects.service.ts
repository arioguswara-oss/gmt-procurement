import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryOrderStatus, InvoiceStatus, Prisma, QuotationStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectWorkflowInclude = Prisma.validator<Prisma.ProjectInclude>()({
  customer: true,
  projectOwner: { select: { id: true, name: true, email: true, role: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  origin: true,
  quotations: { select: { id: true, quotationNo: true, revisionNo: true, status: true, quotationDate: true } },
  purchaseOrders: {
    include: {
      items: {
        include: {
          deliveryItems: { include: { deliveryOrder: { select: { status: true } } } },
        },
      },
    },
  },
  invoices: { include: { payments: true } },
});

type ProjectWorkflow = Prisma.ProjectGetPayload<{ include: typeof projectWorkflowInclude }>;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogsService,
  ) {}

  private normalizeReference(value: string) {
    return value.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  private deriveStatus(project: ProjectWorkflow): string {
    const finalInvoices = project.invoices.filter((invoice) => invoice.status === InvoiceStatus.FINAL);
    if (finalInvoices.length) {
      const allPaid = finalInvoices.every((invoice) => {
        const paid = invoice.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
        return paid.greaterThanOrEqualTo(invoice.grandTotal);
      });
      return allPaid ? 'PAID' : 'INVOICED';
    }

    if (project.invoices.some((invoice) => invoice.status !== InvoiceStatus.CANCELLED)) return 'INVOICE_DRAFT';

    if (project.purchaseOrders.length) {
      let anyDelivered = false;
      let allDelivered = true;
      for (const po of project.purchaseOrders) {
        for (const item of po.items) {
          const delivered = item.deliveryItems
            .filter((row) => row.deliveryOrder.status !== DeliveryOrderStatus.DRAFT && row.deliveryOrder.status !== DeliveryOrderStatus.CANCELLED)
            .reduce((sum, row) => sum.plus(row.qtyDelivered), new Prisma.Decimal(0));
          if (delivered.greaterThan(0)) anyDelivered = true;
          if (delivered.lessThan(item.qtyOrdered)) allDelivered = false;
        }
      }
      if (allDelivered && anyDelivered) return 'FULLY_DELIVERED';
      if (anyDelivered) return 'PARTIALLY_DELIVERED';
      return 'PO_RECEIVED';
    }

    const latestQuotation = [...project.quotations].sort((a, b) => b.revisionNo - a.revisionNo)[0];
    if (latestQuotation?.status === QuotationStatus.ACCEPTED) return 'QUOTATION_ACCEPTED';
    if (latestQuotation?.status === QuotationStatus.SENT) return 'QUOTATION_SENT';
    if (latestQuotation) return 'QUOTATION_DRAFT';
    return 'OPEN';
  }

  async list(search?: string) {
    const projects = await this.prisma.project.findMany({
      where: search
        ? { OR: [
            { gmtReference: { contains: search } },
            { projectName: { contains: search } },
            { customer: { companyName: { contains: search } } },
          ] }
        : undefined,
      include: projectWorkflowInclude,
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((project) => ({ ...project, workflowStatus: this.deriveStatus(project) }));
  }

  async get(id: bigint) {
    const project = await this.prisma.project.findUnique({ where: { id }, include: projectWorkflowInclude });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    return { ...project, workflowStatus: this.deriveStatus(project) };
  }

  async create(dto: CreateProjectDto, userId: bigint) {
    const gmtReference = this.normalizeReference(dto.gmtReference);
    const duplicate = await this.prisma.project.findUnique({ where: { gmtReference }, select: { id: true } });
    if (duplicate) throw new ConflictException('GMT Reference sudah digunakan oleh project lain');

    const customerId = BigInt(dto.customerId);
    const projectOwnerId = dto.projectOwnerId ? BigInt(dto.projectOwnerId) : userId;

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          gmtReference,
          projectName: dto.projectName.trim(),
          sourceType: dto.sourceType,
          customerId,
          projectOwnerId,
          createdById: userId,
          notes: dto.notes,
        },
      });

      if (dto.origin) {
        await tx.projectOrigin.create({
          data: {
            projectId: created.id,
            originType: dto.sourceType,
            externalReference: dto.origin.externalReference,
            emailSubject: dto.origin.emailSubject,
            senderName: dto.origin.senderName,
            senderEmail: dto.origin.senderEmail,
            receivedAt: dto.origin.receivedAt ? new Date(dto.origin.receivedAt) : undefined,
            quotationDeadline: dto.origin.quotationDeadline ? new Date(dto.origin.quotationDeadline) : undefined,
            notes: dto.origin.notes,
            createdById: userId,
          },
        });
      }
      return created;
    });

    await this.activity.write({
      projectId: project.id,
      userId,
      action: 'CREATED',
      entityType: 'PROJECT',
      entityId: project.id,
      description: `Project ${project.gmtReference} dibuat`,
    });
    return this.get(project.id);
  }

  async update(id: bigint, dto: UpdateProjectDto, userId: bigint) {
    const old = await this.get(id);
    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        projectName: dto.projectName?.trim(),
        customerId: dto.customerId ? BigInt(dto.customerId) : undefined,
        projectOwnerId: dto.projectOwnerId ? BigInt(dto.projectOwnerId) : undefined,
        notes: dto.notes,
      },
    });
    await this.activity.write({
      projectId: id,
      userId,
      action: 'UPDATED',
      entityType: 'PROJECT',
      entityId: id,
      description: `Project ${updated.gmtReference} diperbarui`,
      oldValuesJson: { projectName: old.projectName, customerId: old.customerId.toString(), projectOwnerId: old.projectOwnerId.toString(), notes: old.notes },
      newValuesJson: { projectName: updated.projectName, customerId: updated.customerId.toString(), projectOwnerId: updated.projectOwnerId.toString(), notes: updated.notes },
    });
    return this.get(id);
  }
}
