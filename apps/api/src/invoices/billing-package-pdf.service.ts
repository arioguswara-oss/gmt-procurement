import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentType, InvoiceStatus, ReceiptStatus, TaxDocumentStatus } from '@prisma/client';
import { DocumentsService } from '../documents/documents.service';
import { PdfPart, PdfService } from '../pdf/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptPrintService } from '../receipts/receipt-print.service';
import { InvoicePrintService } from './invoice-print.service';
import { InvoicesService } from './invoices.service';

@Injectable()
export class BillingPackagePdfService {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly invoicePrint: InvoicePrintService,
    private readonly receiptPrint: ReceiptPrintService,
    private readonly documents: DocumentsService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  private async settingBoolean(key: string, fallback: boolean) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    return typeof setting?.value === 'boolean' ? setting.value : fallback;
  }

  private uniqueDocuments<T extends { id: bigint }>(rows: T[]) {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const id = row.id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  async build(invoiceId: bigint) {
    const row = await this.invoices.get(invoiceId);
    if (row.status !== InvoiceStatus.FINAL) throw new BadRequestException('Billing Package hanya dapat dibuat dari Invoice FINAL');

    const requireReceipt = await this.settingBoolean('BILLING_PACKAGE_REQUIRE_RECEIPT', true);
    if (requireReceipt && (!row.receipt || row.receipt.status !== ReceiptStatus.FINAL)) {
      throw new BadRequestException('Finalize Kwitansi terlebih dahulu sebelum membuat Billing Package');
    }

    const poDocs = row.purchaseOrder.documents.filter((doc) => doc.documentType === DocumentType.ORIGINAL_PO);
    if (!poDocs.length) throw new BadRequestException('Original Customer PO belum diupload');

    const receivingDocs = this.uniqueDocuments(row.deliveryLinks.flatMap((link) => [
      ...link.deliveryOrder.documents.filter((doc) => doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT),
      ...link.deliveryOrder.receivingDocuments.flatMap((receiving) =>
        receiving.documents.filter((doc) => doc.documentType === DocumentType.SIGNED_DO || doc.documentType === DocumentType.RECEIVING_DOCUMENT),
      ),
    ]));
    if (!receivingDocs.length) throw new BadRequestException('Signed DO / Receiving Evidence belum tersedia');

    const taxDocs = this.uniqueDocuments(row.taxDocuments.flatMap((tax) =>
      tax.status === TaxDocumentStatus.CANCELLED ? [] : tax.documents.filter((doc) => doc.documentType === DocumentType.TAX_INVOICE),
    ));
    const requireTax = await this.settingBoolean('REQUIRE_TAX_INVOICE_BEFORE_FINAL_INVOICE', true);
    if (requireTax && !taxDocs.length) throw new BadRequestException('Faktur Pajak Coretax belum tersedia');

    const parts: PdfPart[] = [];
    const invoicePdf = await this.pdf.htmlToPdf(await this.invoicePrint.render(invoiceId));
    parts.push({ label: 'Invoice', filename: `${row.invoiceNo}.pdf`, mimeType: 'application/pdf', buffer: invoicePdf });

    for (const doc of poDocs) {
      const file = await this.documents.readBuffer(doc.id);
      parts.push({ label: 'Customer PO', filename: doc.originalFilename, mimeType: doc.mimeType, buffer: file.buffer });
    }

    for (const doc of receivingDocs) {
      const file = await this.documents.readBuffer(doc.id);
      parts.push({ label: 'Signed DO / Receiving Evidence', filename: doc.originalFilename, mimeType: doc.mimeType, buffer: file.buffer });
    }

    for (const doc of taxDocs) {
      const file = await this.documents.readBuffer(doc.id);
      parts.push({ label: 'Faktur Pajak Coretax', filename: doc.originalFilename, mimeType: doc.mimeType, buffer: file.buffer });
    }

    if (row.receipt?.status === ReceiptStatus.FINAL) {
      const receiptPdf = await this.pdf.htmlToPdf(await this.receiptPrint.render(row.receipt.id));
      parts.push({ label: 'Kwitansi', filename: `${row.receipt.receiptNo}.pdf`, mimeType: 'application/pdf', buffer: receiptPdf });
    }

    return {
      invoice: row,
      buffer: await this.pdf.merge(parts),
      partCount: parts.length,
      parts: parts.map((part) => ({ label: part.label, filename: part.filename, mimeType: part.mimeType })),
    };
  }

  async archive(invoiceId: bigint, userId: bigint) {
    const built = await this.build(invoiceId);
    const filename = `${built.invoice.invoiceNo.replace(/[^A-Za-z0-9._-]+/g, '_')}_Billing_Package.pdf`;
    return this.documents.storeGenerated({
      projectId: built.invoice.projectId,
      invoiceId,
      purchaseOrderId: built.invoice.purchaseOrderId,
      documentType: DocumentType.BILLING_PACKAGE_PDF,
      originalFilename: filename,
      buffer: built.buffer,
      userId,
      notes: `Billing package generated from ${built.partCount} PDF/image sources`,
    });
  }
}
