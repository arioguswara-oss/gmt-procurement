// Run AFTER API build: node --test scripts/test_tax_invoice_file_validation.cjs
// Mock-only: no uploads, filesystem writes, database or network access.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DocumentType } = require('@prisma/client');
const { assertTaxInvoiceFile } = require('../apps/api/dist/documents/tax-invoice-file-validator');
const { DocumentsService } = require('../apps/api/dist/documents/documents.service');

const pdf = Buffer.from('%PDF-1.7\nmock content');
const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
const jpg = Buffer.from('ffd8ffe00000', 'hex');
const file = (originalname, buffer) => ({
  originalname, buffer, size: buffer.length, mimetype: 'application/octet-stream',
});

test('Coretax accepts valid PDF signature even if browser supplies generic MIME', () =>
  assert.doesNotThrow(() => assertTaxInvoiceFile(file('faktur.PDF', pdf))));
test('Coretax accepts valid PNG scan', () =>
  assert.doesNotThrow(() => assertTaxInvoiceFile(file('scan.png', png))));
test('Coretax accepts JPEG/JPG scans', () => {
  assert.doesNotThrow(() => assertTaxInvoiceFile(file('scan.jpg', jpg)));
  assert.doesNotThrow(() => assertTaxInvoiceFile(file('scan.jpeg', jpg)));
});
test('Coretax rejects ZIP and Word even if files are allowed for normal support uploads', () => {
  for (const name of ['invoice.zip', 'invoice.docx', 'invoice.xlsx']) {
    assert.throws(() => assertTaxInvoiceFile(file(name, Buffer.from('PK\\x03\\x04'))), { status: 400 });
  }
});
test('Coretax rejects extension spoofing and empty payload', () => {
  for (const name of ['fake.pdf', 'fake.png', 'fake.jpg']) {
    assert.throws(() => assertTaxInvoiceFile(file(name, Buffer.from('Not a scan'))), { status: 400 });
  }
  assert.throws(() => assertTaxInvoiceFile(file('empty.pdf', Buffer.alloc(0))), { status: 400 });
});
test('generic project upload rejects TAX_INVOICE missing invoice/tax record link before storage', async () => {
  const mock = new DocumentsService({
    project: { findUnique: async () => ({ id: 3n, createdAt: new Date() }) },
  }, { get: () => 25 }, {});
  await assert.rejects(mock.upload(3n, { documentType: DocumentType.TAX_INVOICE }, file('scan.pdf', pdf), 1n), { status: 400 });
});
test('generic project upload rejects mismatched active tax-invoice relationship before storage', async () => {
  let linkedCheck = 0;
  const mock = new DocumentsService({
    project: { findUnique: async () => ({ id: 3n, createdAt: new Date() }) },
    invoice: { findFirst: async () => ({ id: 9n }) },
    taxDocument: { findFirst: async ({ where }) => {
      if (where.invoiceId !== undefined) { linkedCheck++; return null; }
      return { id: 2n };
    } },
  }, { get: () => 25 }, {});
  await assert.rejects(mock.upload(3n, {
    documentType: DocumentType.TAX_INVOICE, invoiceId: '9', taxDocumentId: '2',
  }, file('scan.pdf', pdf), 1n), { status: 400 });
  assert.equal(linkedCheck, 1);
});
