import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly activity: ActivityLogsService) {}

  async list(invoiceId: bigint) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, grandTotal: true } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    const payments = await this.prisma.payment.findMany({ where: { invoiceId }, include: { documents: true }, orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }] });
    const paid = payments.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    return { invoiceId, grandTotal: invoice.grandTotal, paid, outstanding: invoice.grandTotal.minus(paid), payments };
  }

  async create(invoiceId: bigint, dto: CreatePaymentDto, userId: bigint) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== InvoiceStatus.FINAL) throw new BadRequestException('Payment hanya dapat dicatat untuk Invoice FINAL');

    const paid = invoice.payments.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    const outstanding = invoice.grandTotal.minus(paid);
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.greaterThan(outstanding)) {
      throw new BadRequestException(`Payment melebihi outstanding invoice. Outstanding: ${outstanding.toString()}`);
    }

    const row = await this.prisma.payment.create({
      data: {
        invoiceId,
        paymentDate: new Date(dto.paymentDate),
        amount,
        paymentMethod: dto.paymentMethod,
        referenceNo: dto.referenceNo,
        notes: dto.notes,
        createdById: userId,
      },
      include: { documents: true },
    });

    const newPaid = paid.plus(amount);
    await this.activity.write({
      projectId: invoice.projectId,
      userId,
      action: 'CREATED',
      entityType: 'PAYMENT',
      entityId: row.id,
      description: `Payment ${amount.toString()} dicatat untuk Invoice ${invoice.invoiceNo}${newPaid.equals(invoice.grandTotal) ? ' (PAID)' : ' (PARTIAL)'}`,
    });
    return { payment: row, paid: newPaid, outstanding: invoice.grandTotal.minus(newPaid), paymentStatus: newPaid.equals(invoice.grandTotal) ? 'PAID' : 'PARTIALLY_PAID' };
  }
}
