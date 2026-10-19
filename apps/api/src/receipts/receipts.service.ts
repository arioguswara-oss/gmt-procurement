import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma, ReceiptStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

const receiptInclude = Prisma.validator<Prisma.ReceiptInclude>()({
  invoice: {
    include: {
      project: true,
      purchaseOrder: true,
      billTo: true,
    },
  },
  documents: true,
});

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: DocumentSequencesService,
    private readonly activity: ActivityLogsService,
  ) {}

  private async template() {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: 'RECEIPT_NUMBER_TEMPLATE' } });
    return typeof setting?.value === 'string' ? setting.value : '{GMT_REF}/KWT-{SEQ2}';
  }

  private async generateReceiptNo(projectId: bigint, gmtReference: string) {
    const seq = await this.sequences.next('RECEIPT', projectId.toString(), gmtReference);
    const template = await this.template();
    return template
      .replaceAll('{GMT_REF}', gmtReference)
      .replaceAll('{SEQ}', String(seq))
      .replaceAll('{SEQ2}', String(seq).padStart(2, '0'))
      .replaceAll('{SEQ3}', String(seq).padStart(3, '0'));
  }

  private integerToWords(value: bigint): string {
    if (value === 0n) return 'zero';
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const underThousand = (n: number) => {
      const parts: string[] = [];
      if (n >= 100) { parts.push(`${ones[Math.floor(n / 100)]} hundred`); n %= 100; }
      if (n >= 20) { parts.push(tens[Math.floor(n / 10)]); if (n % 10) parts.push(ones[n % 10]); }
      else if (n > 0) parts.push(ones[n]);
      return parts.join(' ');
    };
    const groups: Array<[bigint, string]> = [[1000000000000n, 'trillion'], [1000000000n, 'billion'], [1000000n, 'million'], [1000n, 'thousand']];
    let remain = value;
    const parts: string[] = [];
    for (const [size, label] of groups) {
      if (remain >= size) {
        const group = Number(remain / size);
        parts.push(`${underThousand(group)} ${label}`);
        remain %= size;
      }
    }
    if (remain > 0n) parts.push(underThousand(Number(remain)));
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private amountInWords(amount: Prisma.Decimal) {
    const integer = BigInt(amount.toDecimalPlaces(0, Prisma.Decimal.ROUND_FLOOR).toString());
    return `${this.integerToWords(integer)} Indonesian rupiah only`;
  }

  async getByInvoice(invoiceId: bigint) {
    const row = await this.prisma.receipt.findUnique({ where: { invoiceId }, include: receiptInclude });
    if (!row) throw new NotFoundException('Kwitansi belum dibuat');
    return row;
  }

  async get(id: bigint) {
    const row = await this.prisma.receipt.findUnique({ where: { id }, include: receiptInclude });
    if (!row) throw new NotFoundException('Kwitansi tidak ditemukan');
    return row;
  }

  async create(invoiceId: bigint, dto: CreateReceiptDto, userId: bigint) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { project: true, purchaseOrder: true, billTo: true, receipt: true },
    });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== InvoiceStatus.FINAL) throw new BadRequestException('Kwitansi hanya dapat dibuat setelah Invoice FINAL');
    if (invoice.receipt) throw new ConflictException('Invoice ini sudah memiliki Kwitansi');

    const receiptNo = await this.generateReceiptNo(invoice.projectId, invoice.project.gmtReference);
    const row = await this.prisma.receipt.create({
      data: {
        invoiceId,
        receiptNo,
        receiptDate: new Date(dto.receiptDate),
        receivedFrom: invoice.billTo.companyName,
        amount: invoice.grandTotal,
        amountInWords: this.amountInWords(invoice.grandTotal),
        description: dto.description ?? `Payment of PO No. ${invoice.purchaseOrder.poNo}; Invoice No. ${invoice.invoiceNo}`,
        status: ReceiptStatus.DRAFT,
        createdById: userId,
      },
      include: receiptInclude,
    });

    await this.activity.write({
      projectId: invoice.projectId, userId, action: 'CREATED', entityType: 'RECEIPT', entityId: row.id,
      description: `Kwitansi ${row.receiptNo} dibuat dari Invoice ${invoice.invoiceNo}`,
    });
    return row;
  }

  async finalize(id: bigint, userId: bigint) {
    const current = await this.get(id);
    if (current.status === ReceiptStatus.FINAL) return current;
    if (current.status === ReceiptStatus.CANCELLED) throw new BadRequestException('Kwitansi sudah dibatalkan');

    const company = await this.prisma.companyProfile.findFirst();
    if (!company) throw new BadRequestException('Company Profile belum diisi');
    const row = await this.prisma.receipt.update({
      where: { id },
      data: {
        status: ReceiptStatus.FINAL,
        sellerSnapshot: {
          companyName: company.companyName, address: company.address, city: company.city, province: company.province,
          postalCode: company.postalCode, phone: company.phone, email: company.email,
        },
        customerSnapshot: {
          companyName: current.invoice.billTo.companyName, address: current.invoice.billTo.address,
          city: current.invoice.billTo.city, province: current.invoice.billTo.province, postalCode: current.invoice.billTo.postalCode,
        },
        signatorySnapshot: { name: company.defaultSignatoryName, title: company.defaultSignatoryTitle },
        finalizedAt: new Date(),
      },
      include: receiptInclude,
    });
    await this.activity.write({
      projectId: current.invoice.projectId, userId, action: 'FINALIZED', entityType: 'RECEIPT', entityId: id,
      description: `Kwitansi ${row.receiptNo} difinalkan`,
    });
    return row;
  }
}
