import { BadRequestException } from '@nestjs/common';
import { DocumentType, InvoiceStatus, TaxDocumentStatus } from '@prisma/client';

type InvoiceTaxProof = {
  status: InvoiceStatus;
  taxDocuments: ReadonlyArray<{
    status: TaxDocumentStatus;
    verifiedById?: bigint | null;
    verifiedAt?: Date | null;
    documents: ReadonlyArray<{ documentType: DocumentType }>;
  }>;
};

/**
 * A print/download gate, independent of the configurable invoice-finalization setting.
 * Upload alone never authorizes printing; explicit verification evidence is required.
 */
export function assertInvoicePrintable(invoice: InvoiceTaxProof): void {
  if (invoice.status !== InvoiceStatus.FINAL) {
    throw new BadRequestException('Invoice harus FINAL sebelum dapat dicetak');
  }
  const hasCurrentCoretaxFile = invoice.taxDocuments.some(
    (tax) => tax.status === TaxDocumentStatus.VERIFIED &&
      typeof tax.verifiedById === 'bigint' && tax.verifiedById > 0n &&
      tax.verifiedAt instanceof Date && Number.isFinite(tax.verifiedAt.getTime()) &&
      tax.documents.some((file) => file.documentType === DocumentType.TAX_INVOICE),
  );
  if (!hasCurrentCoretaxFile) {
    throw new BadRequestException('Faktur Pajak Coretax aktif harus diupload dan diverifikasi Pak Supri sebelum mencetak Invoice atau Kwitansi');
  }
}
