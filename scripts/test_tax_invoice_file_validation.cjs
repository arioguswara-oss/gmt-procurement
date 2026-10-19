// Run AFTER API build: node --test scripts/test_tax_invoice_file_validation.cjs
// Mock-only: no uploads, filesystem writes, database or network access.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DocumentType } = require('@prisma/client');
const { assertTaxInvoiceFile } = require('../apps/api/dist/documents/tax-invoice-file-validator');
const { DocumentsService } = require('../apps/api/dist/documents/documents.service');
const { TaxDocumentsService } = require('../apps/api/dist/tax-documents/tax-documents.service');

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

test('READY_TO_FINALIZE allows replacing an existing Coretax before Invoice FINAL', async () => {
  let stored = false, superseded = false, invoiceKeptReady = false, audited = false;
  const prisma = {
    invoice: { findUnique: async ({ where }) => {
      assert.equal(where.id, 9n);
      return { id: 9n, projectId: 3n, invoiceNo: 'INV-TEST', status: 'READY_TO_FINALIZE', project: { id: 3n } };
    } },
    taxDocument: {
      create: async ({ data }) => {
        assert.equal(data.invoiceId, 9n);
        return { id: 6n, status: 'UPLOADED' };
      },
      findUnique: async () => ({ id: 6n, status: 'UPLOADED', documents: [{ id: 7n }] }),
      delete: async () => assert.fail('No cleanup should be needed'),
    },
    $transaction: async fn => fn({
      taxDocument: { updateMany: async ({ where, data }) => {
        assert.equal(where.invoiceId, 9n);
        assert.equal(where.id.not, 6n);
        assert.equal(data.status, 'REPLACED');
        superseded = true;
      } },
      invoice: { update: async ({ where, data }) => {
        assert.equal(where.id, 9n);
        assert.equal(data.status, 'READY_TO_FINALIZE');
        invoiceKeptReady = true;
      } },
    }),
  };
  const docs = { upload: async (_projectId, dto, theFile) => {
    assert.equal(dto.invoiceId, '9');
    assert.equal(dto.taxDocumentId, '6');
    assert.equal(theFile.originalname, 'replacement.pdf');
    stored = true;
    return { id: 7n };
  } };
  const service = new TaxDocumentsService(prisma, docs, {
    write: async ({ action }) => { assert.equal(action, 'UPLOADED'); audited = true; },
  });
  const result = await service.upload(9n, {}, file('replacement.pdf', pdf), 2n);
  assert.equal(result.taxDocument.status, 'UPLOADED');
  assert.equal(stored && superseded && invoiceKeptReady && audited, true);
});
