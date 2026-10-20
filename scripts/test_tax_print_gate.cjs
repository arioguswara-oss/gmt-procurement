// Run after API build (npm run build:api). No database, network, app bootstrap, or credentials.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { assertInvoicePrintable } = require('../apps/api/dist/common/print/tax-invoice-print-gate');
const { InvoicePrintService } = require('../apps/api/dist/invoices/invoice-print.service');
const { ReceiptPrintService } = require('../apps/api/dist/receipts/receipt-print.service');

const invoice = (status = 'FINAL', taxDocuments = []) => ({ status, taxDocuments });
const tax = (status = 'VERIFIED', documentType = 'TAX_INVOICE') =>
  ({ status, verifiedById: 7n, verifiedAt: new Date('2026-10-20T00:00:00Z'), documents: [{ documentType }] });

test('print gate rejects FINAL invoice with no Coretax attachment', () =>
  assert.throws(() => assertInvoicePrintable(invoice()), { status: 400 }));
test('print gate rejects unlinked/non-tax attachments', () =>
  assert.throws(() => assertInvoicePrintable(invoice('FINAL', [tax('VERIFIED', 'ORIGINAL_PO')])), { status: 400 }));
test('print gate rejects REPLACED tax document', () =>
  assert.throws(() => assertInvoicePrintable(invoice('FINAL', [tax('REPLACED')])), { status: 400 }));
test('print gate rejects CANCELLED tax document', () =>
  assert.throws(() => assertInvoicePrintable(invoice('FINAL', [tax('CANCELLED')])), { status: 400 }));
test('print gate rejects DRAFT even when tax document is present', () =>
  assert.throws(() => assertInvoicePrintable(invoice('DRAFT', [tax()])), { status: 400 }));
test('print gate allows FINAL invoice with active Coretax attachment', () =>
  assert.doesNotThrow(() => assertInvoicePrintable(invoice('FINAL', [tax()]))));

test('Invoice HTML preview blocks before HTML generation without Coretax', async () => {
  const service = new InvoicePrintService(
    { get: async () => invoice() },
    { companyProfile: { findFirst: () => assert.fail('must not query company for blocked print') } },
  );
  await assert.rejects(service.render(1n), { status: 400 });
});
test('Kwitansi HTML preview blocks when linked FINAL invoice lacks Coretax', async () => {
  const service = new ReceiptPrintService(
    { get: async () => ({ status: 'FINAL', invoice: invoice() }) },
    { companyProfile: { findFirst: () => assert.fail('must not query company for blocked print') } },
  );
  await assert.rejects(service.render(2n), { status: 400 });
});
test('Kwitansi HTML preview blocks DRAFT even when invoice has Coretax', async () => {
  const service = new ReceiptPrintService(
    { get: async () => ({ status: 'DRAFT', invoice: invoice('FINAL', [tax()]) }) },
    { companyProfile: { findFirst: () => assert.fail('must not query company for blocked print') } },
  );
  await assert.rejects(service.render(2n), { status: 400 });
});
