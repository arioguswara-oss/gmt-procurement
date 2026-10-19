import { Injectable } from '@nestjs/common';
import { QuotationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuotationsService } from './quotations.service';

@Injectable()
export class QuotationPrintService {
  constructor(
    private readonly quotations: QuotationsService,
    private readonly prisma: PrismaService,
  ) {}

  private esc(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private date(value?: Date | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(value);
  }

  private number(value: unknown, currency = 'IDR') {
    const n = Number(value ?? 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  }

  async render(id: bigint) {
    const q = await this.quotations.get(id);
    const liveCompany = await this.prisma.companyProfile.findFirst();
    const seller = (q.sellerSnapshot ?? (liveCompany ? {
      companyName: liveCompany.companyName, legalName: liveCompany.legalName, npwp: liveCompany.npwp,
      email: liveCompany.email, phone: liveCompany.phone, address: liveCompany.address, city: liveCompany.city,
      province: liveCompany.province, postalCode: liveCompany.postalCode, country: liveCompany.country,
    } : {})) as Record<string, unknown>;
    const customer = (q.customerSnapshot ?? {}) as Record<string, unknown>;
    const signatory = (q.signatorySnapshot ?? (liveCompany ? { name: liveCompany.defaultSignatoryName, title: liveCompany.defaultSignatoryTitle } : {})) as Record<string, unknown>;

    const sellerName = seller.companyName ?? 'PT Gayuh Mandala Teknika';
    const customerName = customer.companyName ?? q.customer.companyName;
    const customerAddress = [
      customer.address ?? q.customer.address,
      customer.city ?? q.customer.city,
      customer.province ?? q.customer.province,
      customer.postalCode ?? q.customer.postalCode,
    ].filter(Boolean).join(', ');

    const itemRows = q.items.map((item) => `
      <tr>
        <td class="c">${item.lineNo}</td>
        <td class="description">${this.esc(item.description)}${item.notes ? `<div class="item-note"><strong>Note:</strong> ${this.esc(item.notes)}</div>` : ""}</td>
        <td class="r">${this.esc(item.qty.toString())}</td>
        <td class="c">${this.esc(item.uom)}</td>
        <td class="r">${this.esc(this.number(item.unitPrice, q.currency))}</td>
        <td class="r">${this.esc(this.number(item.lineTotal, q.currency))}</td>
      </tr>`).join('');

    const terms = [
      q.deliveryTime ? `<li><strong>Delivery Time:</strong> ${this.esc(q.deliveryTime)}</li>` : '',
      q.certificateTerm ? `<li><strong>Certificate:</strong> ${this.esc(q.certificateTerm)}</li>` : '',
      q.paymentTerm ? `<li><strong>Payment Term:</strong> ${this.esc(q.paymentTerm)}</li>` : '',
      q.deliveryTerm ? `<li><strong>Delivery / Price Term:</strong> ${this.esc(q.deliveryTerm)}</li>` : '',
      q.additionalNotes ? `<li>${this.esc(q.additionalNotes)}</li>` : '',
    ].filter(Boolean).join('');

    const draftMark = q.status === QuotationStatus.DRAFT ? '<div class="watermark">DRAFT</div>' : '';
    const revText = q.revisionNo > 0 ? ` / Rev.${q.revisionNo}` : '';

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${this.esc(q.quotationNo)}${this.esc(revText)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10.5pt; }
  .page { width: 186mm; min-height: 273mm; margin: 0 auto; position: relative; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:5mm; }
  .company { font-size:16pt; font-weight:700; }
  .company-meta { margin-top:2mm; line-height:1.45; max-width:110mm; }
  .quote-title { font-size:20pt; font-weight:700; letter-spacing:.5px; text-align:right; }
  .meta { margin-top:5mm; display:grid; grid-template-columns:1fr 1fr; gap:4mm 10mm; }
  .box { border:1px solid #bbb; padding:3mm; min-height:27mm; }
  .label { font-weight:700; display:inline-block; min-width:28mm; }
  table { width:100%; border-collapse:collapse; margin-top:5mm; }
  th, td { border:1px solid #777; padding:2.2mm; vertical-align:top; }
  th { background:#efefef; text-align:center; font-size:9.5pt; }
  td.description { white-space:pre-wrap; line-height:1.35; }
  .item-note { margin-top:2mm; color:#334155; font-size:9pt; white-space:pre-wrap; }
  .c { text-align:center; } .r { text-align:right; white-space:nowrap; }
  .bottom { display:grid; grid-template-columns:1.4fr .8fr; gap:5mm; margin-top:5mm; }
  .notes { border:1px solid #aaa; padding:3mm; min-height:42mm; }
  .notes h3 { margin:0 0 2mm; font-size:10.5pt; }
  .notes ol { margin:0; padding-left:5mm; } .notes li { margin-bottom:1.5mm; }
  .totals { width:100%; margin:0; }
  .totals td { border:0; border-bottom:1px solid #ddd; padding:1.8mm 1mm; }
  .total-final td { border-top:2px solid #111; border-bottom:2px solid #111; font-weight:700; font-size:11pt; }
  .signature { margin-top:12mm; width:70mm; }
  .sign-space { height:20mm; }
  .footer { margin-top:12mm; border-top:1px solid #aaa; padding-top:3mm; font-size:8.5pt; line-height:1.4; }
  .watermark { position:fixed; top:120mm; left:35mm; transform:rotate(-35deg); font-size:64pt; color:rgba(0,0,0,.08); font-weight:700; z-index:-1; }
  .no-print { margin: 0 0 4mm; text-align:right; }
  @media print { .no-print { display:none; } .page { width:auto; min-height:auto; } }
</style>
</head>
<body>
${draftMark}
<div class="page">
  <div class="no-print"><button onclick="window.print()">Print A4</button></div>
  <div class="header">
    <div>
      <div class="company">${this.esc(sellerName)}</div>
      <div class="company-meta">
        ${this.esc(seller.address ?? '')}<br/>
        ${this.esc([seller.city, seller.province, seller.postalCode].filter(Boolean).join(', '))}<br/>
        ${seller.phone ? `Tel: ${this.esc(seller.phone)}` : ''}${seller.email ? ` &nbsp; Email: ${this.esc(seller.email)}` : ''}
      </div>
    </div>
    <div>
      <div class="quote-title">QUOTE</div>
      <div style="text-align:right;margin-top:2mm"><strong>${this.esc(q.quotationNo)}${this.esc(revText)}</strong></div>
    </div>
  </div>

  <div class="meta">
    <div class="box">
      <div><span class="label">Customer</span> ${this.esc(q.customerContact?.name ?? '')}</div>
      <div style="font-weight:700;margin-top:1mm">${this.esc(customerName)}</div>
      <div>${this.esc(customerAddress)}</div>
      ${q.customer.phone ? `<div>Tel: ${this.esc(q.customer.phone)}</div>` : ''}
    </div>
    <div class="box">
      <div><span class="label">Date</span> ${this.esc(this.date(q.quotationDate))}</div>
      <div><span class="label">Valid Until</span> ${this.esc(this.date(q.validUntil))}</div>
      <div><span class="label">RFQ No.</span> ${this.esc(q.rfqNo ?? '-')}</div>
      <div><span class="label">Quote No.</span> ${this.esc(q.quotationNo)}${this.esc(revText)}</div>
      <div style="margin-top:2mm"><strong>Quote/Project Description</strong><br/>${this.esc(q.subject ?? q.project.projectName)}</div>
    </div>
  </div>

  <table>
    <thead><tr><th style="width:9mm">No</th><th>Description</th><th style="width:18mm">Qty</th><th style="width:17mm">UoM</th><th style="width:32mm">Price Line</th><th style="width:34mm">Line Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="bottom">
    <div class="notes"><h3>Special Notes and Instructions</h3><ol>${terms}</ol></div>
    <div>
      <table class="totals">
        <tr><td>Subtotal</td><td class="r">${this.esc(this.number(q.subtotal, q.currency))}</td></tr>
        <tr><td>Discount${q.discountRate ? ` (${this.esc(q.discountRate.toString())}%)` : ''}</td><td class="r">${this.esc(this.number(q.discountAmount, q.currency))}</td></tr>
        <tr><td>Tax Base</td><td class="r">${this.esc(this.number(q.taxBase, q.currency))}</td></tr>
        <tr><td>VAT${q.taxRate ? ` (${this.esc(q.taxRate.toString())}%)` : ''}</td><td class="r">${this.esc(this.number(q.taxAmount, q.currency))}</td></tr>
        <tr class="total-final"><td>Total</td><td class="r">${this.esc(this.number(q.grandTotal, q.currency))}</td></tr>
      </table>
    </div>
  </div>

  <div class="signature">
    <div>Best Regards,</div><div class="sign-space"></div>
    <div><strong>${this.esc(signatory.name ?? '')}</strong></div>
    <div>${this.esc(signatory.title ?? '')}</div>
  </div>

  <div class="footer">Thank you for your business.</div>
</div>
</body>
</html>`;
  }
}
