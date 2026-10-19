// Run AFTER API build: node --test scripts/test_billing_archive_gate.cjs
// Mock-only: no app bootstrap, no database/network/credentials.
// Uses its own test source path for a synthetic existing PDF path, without reading or writing files.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DocumentType, InvoiceStatus, ReceiptStatus, TaxDocumentStatus } = require('@prisma/client');
const { DocumentsService } = require('../apps/api/dist/documents/documents.service');

function document(type, overrides = {}) {
  return { id: 1n, projectId: 3n, invoiceId: 9n, receiptId: 4n,
    documentType: type, storagePath: __filename, originalFilename: 'archived.pdf',
    mimeType: 'application/pdf', ...overrides };
}
const tax = (status = TaxDocumentStatus.UPLOADED, type = DocumentType.TAX_INVOICE) =>
  ({ status, documents: [{ documentType: type }] });
const invoice = (taxDocuments = [tax()], overrides = {}) =>
  ({ id: 9n, projectId: 3n, status: InvoiceStatus.FINAL, taxDocuments, ...overrides });
function service(doc, inv = invoice(), receipt = { invoiceId: 9n, status: ReceiptStatus.FINAL }) {
  const seen = { invoice: 0, receipt: 0 };
  return {
    seen,
    documents: new DocumentsService({
      document: { findUnique: async ({ where }) => { assert.equal(where.id, 1n); return doc; } },
      invoice: { findUnique: async ({ where }) => { seen.invoice++; assert.equal(where.id, 9n); return inv; } },
      receipt: { findUnique: async ({ where }) => { seen.receipt++; assert.equal(where.id, 4n); return receipt; } },
    }, {}, {}),
  };
}

test('archived Invoice PDF refuses download when Coretax is missing', async () => {
  const mock = service(document(DocumentType.INVOICE_PDF), invoice([]));
  await assert.rejects(mock.documents.download(1n), { status: 400 });
  assert.equal(mock.seen.invoice, 1);
});
test('archived Billing Package rejects replaced or wrong Coretax attachment', async () => {
  for (const t of [tax(TaxDocumentStatus.REPLACED), tax(TaxDocumentStatus.UPLOADED, DocumentType.ORIGINAL_PO)]) {
    const mock = service(document(DocumentType.BILLING_PACKAGE_PDF), invoice([t]));
    await assert.rejects(mock.documents.download(1n), { status: 400 });
  }
});
test('archive with missing invoiceId fails closed rather than bypass gate', async () => {
  const mock = service(document(DocumentType.INVOICE_PDF, { invoiceId: null }));
  await assert.rejects(mock.documents.download(1n), { status: 400 });
  assert.equal(mock.seen.invoice, 0);
});
test('archived Kwitansi rejects non-FINAL receipt despite valid Coretax', async () => {
  const mock = service(document(DocumentType.RECEIPT_PDF), invoice(), { invoiceId: 9n, status: ReceiptStatus.DRAFT });
  await assert.rejects(mock.documents.download(1n), { status: 400 });
  assert.equal(mock.seen.receipt, 1);
});
test('archived Kwitansi rejects receipt linked to a different invoice', async () => {
  const mock = service(document(DocumentType.RECEIPT_PDF), invoice(), { invoiceId: 5n, status: ReceiptStatus.FINAL });
  await assert.rejects(mock.documents.download(1n), { status: 400 });
});
test('archived Invoice and Kwitansi with active Coretax and FINAL state pass guard', async () => {
  for (const type of [DocumentType.INVOICE_PDF, DocumentType.RECEIPT_PDF, DocumentType.BILLING_PACKAGE_PDF]) {
    const mock = service(document(type));
    const result = await mock.documents.download(1n);
    assert.equal(result.document.documentType, type);
    assert.equal(mock.seen.invoice, 1);
    assert.equal(mock.seen.receipt, type === DocumentType.RECEIPT_PDF ? 1 : 0);
  }
});
test('supporting PO document download stays independent of tax invoice', async () => {
  const mock = service(document(DocumentType.ORIGINAL_PO, { invoiceId: null }));
  const result = await mock.documents.download(1n);
  assert.equal(result.document.documentType, DocumentType.ORIGINAL_PO);
  assert.equal(mock.seen.invoice, 0);
  assert.equal(mock.seen.receipt, 0);
});
