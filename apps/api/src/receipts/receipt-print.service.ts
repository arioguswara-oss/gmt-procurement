import { BadRequestException, Injectable } from '@nestjs/common';
import { ReceiptStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from './receipts.service';
import { assertInvoicePrintable } from '../common/print/tax-invoice-print-gate';

@Injectable()
export class ReceiptPrintService {
  constructor(private readonly receipts: ReceiptsService, private readonly prisma: PrismaService) {}

  private esc(value: unknown) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  private date(value?: Date | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(value);
  }
  private money(value: unknown) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));
  }

  async render(id: bigint) {
    const row = await this.receipts.get(id);
    assertInvoicePrintable(row.invoice);
    if (row.status !== ReceiptStatus.FINAL) throw new BadRequestException('Kwitansi harus FINAL sebelum dapat dicetak');
    const company = await this.prisma.companyProfile.findFirst();
    const seller = (row.sellerSnapshot ?? (company ? { companyName: company.companyName, city: company.city } : {})) as Record<string, unknown>;
    const customer = (row.customerSnapshot ?? row.invoice.billTo) as Record<string, unknown>;
    const signatory = (row.signatorySnapshot ?? (company ? { name: company.defaultSignatoryName, title: company.defaultSignatoryTitle } : {})) as Record<string, unknown>;
    const watermark = row.status !== ReceiptStatus.FINAL ? '<div class="watermark">DRAFT</div>' : '';

    return `<!doctype html><html><head><meta charset="utf-8"/><title>${this.esc(row.receiptNo)}</title><style>
@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111}.page{width:180mm;min-height:267mm;margin:auto;position:relative}.no-print{text-align:right;margin-bottom:5mm}.title{text-align:center;font-size:22pt;font-weight:700;text-decoration:underline;margin:8mm 0 2mm}.no{text-align:center;margin-bottom:12mm}.row{display:grid;grid-template-columns:38mm 4mm 1fr;margin-bottom:5mm}.value{font-weight:600}.amount{font-size:14pt;border:2px solid #111;padding:4mm;text-align:center;margin:8mm 0 12mm}.sign{margin-left:auto;width:70mm;text-align:center;margin-top:15mm}.space{height:28mm}.watermark{position:fixed;top:115mm;left:45mm;transform:rotate(-35deg);font-size:64pt;color:rgba(0,0,0,.08);font-weight:700;z-index:-1}@media print{.no-print{display:none}.page{width:auto;min-height:auto}}
</style></head><body>${watermark}<div class="page"><div class="no-print"><button onclick="window.print()">Print A4</button></div><div class="title">KWITANSI</div><div class="no">No. ${this.esc(row.receiptNo)}</div>
<div class="row"><div>Received From</div><div>:</div><div class="value">${this.esc(row.receivedFrom)}</div></div>
<div class="row"><div>Address</div><div>:</div><div>${this.esc([customer.address,customer.city,customer.province,customer.postalCode].filter(Boolean).join(', '))}</div></div>
<div class="row"><div>Amount Received</div><div>:</div><div class="value">Rp. ${this.esc(this.money(row.amount))}</div></div>
<div class="row"><div>Says</div><div>:</div><div># ${this.esc(row.amountInWords ?? '')} #</div></div>
<div class="row"><div>In Payment of</div><div>:</div><div>${this.esc(row.description ?? '')}</div></div>
<div class="amount">Rp. ${this.esc(this.money(row.amount))}</div>
<div class="sign"><div>${this.esc(seller.city ?? 'Kudus')}, ${this.esc(this.date(row.receiptDate))}</div><div class="space"></div><div><strong>${this.esc(signatory.name ?? '')}</strong></div><div>${this.esc(signatory.title ?? '')}</div><div style="margin-top:8mm;border:1px dashed #999;padding:4mm">Materai / Stamp Area</div></div>
</div></body></html>`;
  }
}
