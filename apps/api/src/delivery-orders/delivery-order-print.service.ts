import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryOrdersService } from './delivery-orders.service';

@Injectable()
export class DeliveryOrderPrintService {
  constructor(
    private readonly service: DeliveryOrdersService,
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

  async render(id: bigint) {
    const row = await this.service.get(id);
    const matrix = await this.service.deliveryMatrix(id);
    const company = await this.prisma.companyProfile.findFirst();
    const seller = (row.sellerSnapshot ?? (company ? {
      companyName: company.companyName, address: company.address, city: company.city, province: company.province,
      postalCode: company.postalCode, phone: company.phone, email: company.email,
    } : {})) as Record<string, unknown>;
    const receiver = (row.receiverSnapshot ?? {}) as Record<string, unknown>;
    const receivingParty = row.purchaseOrder.receivingParty ?? row.purchaseOrder.shipTo ?? row.purchaseOrder.buyer;
    // An explicit delivery destination overrides the receiving party's registered address.
    const customDestination = row.deliveryAddress?.trim();
    const destinationAddress = customDestination || receiver.address || receivingParty.address || '-';
    const destinationCity = customDestination
      ? ''
      : [receiver.city ?? receivingParty.city, receiver.province ?? receivingParty.province,
        receiver.postalCode ?? receivingParty.postalCode].filter(Boolean).join(', ');
    const watermark = row.status === 'DRAFT' ? '<div class="watermark">DRAFT</div>'
      : row.status === 'CANCELLED' ? '<div class="watermark">CANCELLED</div>' : '';

    const body = matrix.map((item) => `
      <tr class="${item.marked ? 'marked' : ''}">
        <td class="c">${item.lineNo}</td>
        <td class="description">${this.esc(item.description)}${item.marked && item.notes ? `<div class="item-note"><strong>Item Note:</strong> ${this.esc(item.notes)}</div>` : ''}</td>
        <td class="r">${this.esc(item.qtyOrdered.toString())}</td>
        <td class="c">${this.esc(item.uom)}</td>
        <td class="r">${this.esc(item.previouslyDelivered.toString())}</td>
        <td class="r strong">${item.marked ? '✓ ' : ''}${this.esc(item.thisDelivery.toString())}</td>
        <td class="r">${this.esc(item.balanceAfterThisDo.toString())}</td>
      </tr>`).join('');

    return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${this.esc(row.doNo)}</title>
<style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#111}.page{width:186mm;min-height:273mm;margin:auto}.top{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:4mm}.company{font-size:15pt;font-weight:700}.title{font-size:18pt;font-weight:700;text-align:right}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4mm 8mm;margin-top:5mm}.box{border:1px solid #aaa;padding:3mm;min-height:26mm}.label{font-weight:700;display:inline-block;min-width:29mm}table{border-collapse:collapse;width:100%;margin-top:5mm}th,td{border:1px solid #777;padding:2mm;vertical-align:top}th{background:#eee;text-align:center;font-size:9pt}.c{text-align:center}.r{text-align:right}.strong{font-weight:700}.description{white-space:pre-wrap;line-height:1.35}.item-note{margin-top:1.5mm;color:#334155;font-size:9pt;white-space:pre-wrap}.contact{margin-top:1mm;font-size:9pt}.watermark{position:fixed;top:120mm;left:30mm;transform:rotate(-35deg);font-size:58pt;color:rgba(0,0,0,.09);pointer-events:none;z-index:-1}.marked{background:#f7f7f7}.note{margin-top:4mm;font-size:9pt}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:25mm;margin-top:15mm;text-align:center}.space{height:22mm}.no-print{text-align:right;margin-bottom:4mm}@media print{.no-print{display:none}.page{width:auto;min-height:auto}}
</style></head><body>${watermark}<div class="page">
<div class="no-print"><button onclick="window.print()">Print A4</button></div>
<div class="top"><div><div class="company">${this.esc(seller.companyName ?? 'PT Gayuh Mandala Teknika')}</div><div>${this.esc(seller.address ?? '')}</div><div>${this.esc([seller.city,seller.province,seller.postalCode].filter(Boolean).join(', '))}</div><div class="contact">${seller.email ? `Email: ${this.esc(seller.email)}` : ''}${seller.phone ? ` &nbsp; Tel: ${this.esc(seller.phone)}` : ''}</div></div><div><div class="title">DELIVERY ORDER</div><div><strong>${this.esc(row.doNo)}</strong></div></div></div>
<div class="meta">
<div class="box"><div><span class="label">PO No.</span>${this.esc(row.purchaseOrder.poNo)}</div><div><span class="label">DO Date</span>${this.esc(this.date(row.doDate))}</div><div><span class="label">GMT Ref.</span>${this.esc(row.purchaseOrder.project.gmtReference)}</div></div>
<div class="box"><div style="font-weight:700">Deliver To / Receiving Party</div><div>${this.esc(receiver.companyName ?? receivingParty.companyName)}</div><div>${this.esc(destinationAddress)}</div>${destinationCity ? `<div>${this.esc(destinationCity)}</div>` : ''}${row.deliveryContact ? `<div><span class="label">PIC</span>${this.esc(row.deliveryContact)}</div>` : ''}</div>
</div>
<table><thead><tr><th style="width:8mm">No</th><th>Description</th><th style="width:16mm">PO Qty</th><th style="width:14mm">UoM</th><th style="width:22mm">Previous</th><th style="width:23mm">This DO</th><th style="width:20mm">Balance</th></tr></thead><tbody>${body}</tbody></table>
<div class="note"><strong>Delivery Matrix:</strong> Seluruh item PO ditampilkan untuk memantau pengiriman parsial. Kolom "This DO" menunjukkan jumlah pada surat jalan ini (✓ = dikirim).</div>
${row.notes ? `<div class="note"><strong>Delivery Notes:</strong> ${this.esc(row.notes)}</div>` : ''}
${seller.email ? `<div class="note">Please return a signed delivery confirmation to: ${this.esc(seller.email)}</div>` : ''}
<div class="signatures"><div><div>Delivered By</div><div class="space"></div><div>${this.esc(seller.companyName ?? 'PT Gayuh Mandala Teknika')}</div><div>Name / Signature / Stamp</div></div><div><div>Received By</div><div class="space"></div><div>${this.esc(receiver.companyName ?? receivingParty.companyName)}</div><div>Name / Signature / Stamp</div></div></div>
</div></body></html>`;
  }
}
