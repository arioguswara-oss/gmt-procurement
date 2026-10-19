import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from './invoices.service';
import { assertInvoicePrintable } from '../common/print/tax-invoice-print-gate';

@Injectable()
export class InvoicePrintService {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly prisma: PrismaService,
  ) {}

  private esc(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  private date(value?: Date | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(value);
  }

  private money(value: unknown, currency = 'IDR') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value ?? 0));
  }

  async render(id: bigint) {
    const row = await this.invoices.get(id);
    assertInvoicePrintable(row);
    const company = await this.prisma.companyProfile.findFirst({ include: { bankAccounts: { where: { active: true }, orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] } } });
    const liveSeller = company ? {
      companyName: company.companyName, address: company.address, city: company.city, province: company.province,
      postalCode: company.postalCode, phone: company.phone, email: company.email,
    } : {};
    const seller = (row.sellerSnapshot ?? liveSeller) as Record<string, unknown>;
    const billTo = (row.billToSnapshot ?? row.billTo) as Record<string, unknown>;
    const bank = (row.bankSnapshot ?? (company?.bankAccounts[0] ? {
      bankName: company.bankAccounts[0].bankName, branchName: company.bankAccounts[0].branchName,
      accountNumber: company.bankAccounts[0].accountNumber, accountName: company.bankAccounts[0].accountName,
      swiftCode: company.bankAccounts[0].swiftCode,
    } : {})) as Record<string, unknown>;
    const signatory = (row.signatorySnapshot ?? (company ? { name: company.defaultSignatoryName, title: company.defaultSignatoryTitle } : {})) as Record<string, unknown>;

    const doRefs = row.deliveryLinks.map((link) => link.deliveryOrder.doNo).join(', ');
    const itemRows = row.items.map((item, idx) => `
      <tr>
        <td class="c">${idx + 1}</td>
        <td class="desc">${this.esc(item.description)}</td>
        <td class="r">${this.esc(item.qty.toString())}</td>
        <td class="c">${this.esc(item.uom)}</td>
        <td class="r">${this.esc(this.money(item.unitPrice, row.currency))}</td>
        <td class="r">${this.esc(this.money(item.lineTotal, row.currency))}</td>
      </tr>`).join('');

    const watermark = row.status !== InvoiceStatus.FINAL ? '<div class="watermark">DRAFT</div>' : '';
    return `<!doctype html><html><head><meta charset="utf-8"/><title>${this.esc(row.invoiceNo)}</title>
<style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10pt}.page{width:186mm;min-height:273mm;margin:auto;position:relative}.no-print{text-align:right;margin-bottom:4mm}.top{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:5mm}.company{font-size:15pt;font-weight:700}.title{font-size:21pt;font-weight:700;text-align:right}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4mm 8mm;margin-top:5mm}.box{border:1px solid #aaa;padding:3mm;min-height:30mm}.label{font-weight:700;display:inline-block;min-width:29mm}table{width:100%;border-collapse:collapse;margin-top:5mm}th,td{border:1px solid #777;padding:2.2mm;vertical-align:top}th{background:#eee;text-align:center;font-size:9pt}.desc{white-space:pre-wrap}.c{text-align:center}.r{text-align:right;white-space:nowrap}.bottom{display:grid;grid-template-columns:1fr 75mm;gap:7mm;margin-top:5mm}.bank{border:1px solid #aaa;padding:3mm;min-height:42mm}.totals{margin:0}.totals td{border:0;border-bottom:1px solid #ddd;padding:1.8mm}.totals .final td{border-top:2px solid #111;border-bottom:2px solid #111;font-weight:700}.sign{margin-top:14mm;width:70mm}.space{height:20mm}.watermark{position:fixed;top:120mm;left:40mm;transform:rotate(-35deg);font-size:64pt;color:rgba(0,0,0,.08);font-weight:700;z-index:-1}@media print{.no-print{display:none}.page{width:auto;min-height:auto}}
</style></head><body>${watermark}<div class="page">
<div class="no-print"><button onclick="window.print()">Print A4</button></div>
<div class="top"><div><div class="company">${this.esc(seller.companyName ?? 'PT Gayuh Mandala Teknika')}</div><div>${this.esc(seller.address ?? '')}</div><div>${this.esc([seller.city,seller.province,seller.postalCode].filter(Boolean).join(', '))}</div><div>${seller.phone ? `Phone: ${this.esc(seller.phone)}` : ''}${seller.email ? ` &nbsp; Email: ${this.esc(seller.email)}` : ''}</div></div><div><div class="title">INVOICE</div><div><strong>${this.esc(row.invoiceNo)}</strong></div></div></div>
<div class="meta"><div class="box"><div style="font-weight:700">Bill To</div><div>${this.esc(billTo.companyName ?? row.billTo.companyName)}</div><div>${this.esc(billTo.address ?? row.billTo.address ?? '')}</div><div>${this.esc([billTo.city,billTo.province,billTo.postalCode].filter(Boolean).join(', '))}</div></div><div class="box"><div><span class="label">Invoice Date</span>${this.esc(this.date(row.invoiceDate))}</div><div><span class="label">PO No.</span>${this.esc(row.purchaseOrder.poNo)}</div><div><span class="label">Delivery Order</span>${this.esc(doRefs || '-')}</div><div><span class="label">GMT Ref.</span>${this.esc(row.project.gmtReference)}</div>${row.dueDate ? `<div><span class="label">Due Date</span>${this.esc(this.date(row.dueDate))}</div>` : ''}</div></div>
<table><thead><tr><th style="width:9mm">No</th><th>Description</th><th style="width:18mm">Qty</th><th style="width:17mm">UoM</th><th style="width:33mm">Price</th><th style="width:35mm">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
<div class="bottom"><div class="bank"><strong>BANK INFORMATION</strong><div style="margin-top:2mm">Bank Name: ${this.esc(bank.bankName ?? '-')}</div><div>Branch: ${this.esc(bank.branchName ?? '-')}</div><div>Account Number: ${this.esc(bank.accountNumber ?? '-')}</div><div>Account Name: ${this.esc(bank.accountName ?? '-')}</div><div>SWIFT CODE: ${this.esc(bank.swiftCode ?? '-')}</div>${row.paymentTerm ? `<div style="margin-top:3mm"><strong>Payment Term:</strong> ${this.esc(row.paymentTerm)}</div>` : ''}</div><div><table class="totals"><tr><td>Subtotal</td><td class="r">${this.esc(this.money(row.subtotal,row.currency))}</td></tr><tr><td>Tax Base</td><td class="r">${this.esc(this.money(row.taxBase,row.currency))}</td></tr><tr><td>VAT${row.taxRate ? ` (${this.esc(row.taxRate.toString())}%)` : ''}</td><td class="r">${this.esc(this.money(row.taxAmount,row.currency))}</td></tr><tr class="final"><td>Total</td><td class="r">${this.esc(this.money(row.grandTotal,row.currency))}</td></tr></table></div></div>
<div class="sign"><div>Best Regards,</div><div class="space"></div><div><strong>${this.esc(signatory.name ?? '')}</strong></div><div>${this.esc(signatory.title ?? '')}</div></div>
</div></body></html>`;
  }
}
