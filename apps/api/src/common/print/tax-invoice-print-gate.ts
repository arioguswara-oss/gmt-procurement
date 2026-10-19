import { BadRequestException } from '@nestjs/common';
import { DocumentType, InvoiceStatus, TaxDocumentStatus } from '@prisma/client';

type InvoiceTaxProof = {
  status: InvoiceStatus;
  taxDocuments: ReadonlyArray<{
    status: TaxDocumentStatus;
    documents: ReadonlyArray<{ documentType: DocumentType }>;
  }>;
};

/**
 * A print/download gate, independent of the configurable invoice-finalization setting.
 * Only the CURRENT uploaded Coretax tax invoice for this invoice authorizes printing.
 */
export function assertInvoicePrintable(invoice: InvoiceTaxProof): void {
  if (invoice.status !== InvoiceStatus.FINAL) {
    throw new BadRequestException('Invoice harus FINAL sebelum dapat dicetak');
  }
  const hasCurrentCoretaxFile = invoice.taxDocuments.some(
    (tax) => tax.status === TaxDocumentStatus.UPLOADED &&
      tax.documents.some((file) => file.documentType === DocumentType.TAX_INVOICE),
  );
  if (!hasCurrentCoretaxFile) {
    throw new BadRequestException('Upload Faktur Pajak Coretax yang aktif sebelum mencetak Invoice atau Kwitansi');
  }
}
