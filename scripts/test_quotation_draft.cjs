// Run AFTER API build: node --test scripts/test_quotation_draft.cjs
// Mock-only regression: does not start app, use database, network, or credentials.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Prisma } = require('@prisma/client');
const { QuotationsService } = require('../apps/api/dist/quotations/quotations.service');
const { QuotationPrintService } = require('../apps/api/dist/quotations/quotation-print.service');

const money = (n) => new Prisma.Decimal(n);
const quote = (status = 'DRAFT') => ({
  id: 11n, projectId: 20n, customerId: 30n, quotationNo: 'GMT-QA', revisionNo: 0,
  status, quotationDate: new Date('2026-10-20'), validUntil: new Date('2026-11-20'),
  project: { projectName: 'Example' },
  customer: { companyName: 'Customer', phone: null, address: null, city: null, province: null, postalCode: null },
  customerContact: null, currency: 'IDR', subject: 'Example',
  subtotal: money(100), discountRate: null, discountAmount: money(0),
  taxRate: null, taxBase: money(100), taxAmount: money(0), grandTotal: money(100),
  items: [{ lineNo: 1, description: 'Spare Part A', qty: money(1), uom: 'EA', unitPrice: money(100), lineTotal: money(100), notes: 'Original item note' }],
});
test('SENT quotation rejects edit before any write', async () => {
  let attemptedWrite = false;
  const service = new QuotationsService({
    quotation: { findUnique: async () => quote('SENT') },
    $transaction: () => { attemptedWrite = true; throw Error('unexpected transaction'); },
  }, { write: () => assert.fail('unexpected audit write') });
  await assert.rejects(service.update(11n, { subject: 'Illegal edit' }, 5n), { status: 400 });
  assert.equal(attemptedWrite, false);
});
test('DRAFT quotation PATCH updates existing item notes and totals without creating a new quotation', async () => {
  let deleted = false, payload = null, audit = false;
  const service = new QuotationsService({
    quotation: { findUnique: async () => quote() },
    $transaction: async (fn) => fn({
      quotationItem: { deleteMany: async ({ where }) => { assert.equal(where.quotationId, 11n); deleted = true; } },
      quotation: {
        updateMany: async ({ where }) => { assert.equal(where.id, 11n); assert.equal(where.status, 'DRAFT'); return { count: 1 }; },
        update: async ({ where, data }) => { assert.equal(where.id, 11n); payload = data; return { ...quote(), ...data }; },
      },
    }),
  }, { write: async ({ action }) => { assert.equal(action, 'UPDATED'); audit = true; } });
  const updated = await service.update(11n, {
    items: [
      { description: 'Spare Part A', qty: 2, uom: 'EA', unitPrice: 100, notes: 'Delivery per item 1' },
      { description: 'Spare Part B', qty: 3, uom: 'PCS', unitPrice: 50, notes: 'Certificate per item 2' },
    ],
  }, 5n);
  assert.equal(deleted, true);
  assert.equal(audit, true);
  assert.equal(payload.items.create.length, 2);
  assert.equal(payload.items.create[0].notes, 'Delivery per item 1');
  assert.equal(payload.items.create[1].notes, 'Certificate per item 2');
  assert.equal(payload.subtotal.toString(), '350');
  assert.equal(updated.subtotal.toString(), '350');
});
test('Quotation A4 renders and HTML-escapes notes belonging to each item', async () => {
  const current = quote();
  current.items.push({ lineNo: 2, description: 'Spare Part B', qty: money(1), uom: 'EA', unitPrice: money(25), lineTotal: money(25), notes: 'Certificate B <item>' });
  const print = new QuotationPrintService(
    { get: async () => current },
    { companyProfile: { findFirst: async () => null } },
  );
  const html = await print.render(11n);
  assert.match(html, /Original item note/);
  assert.match(html, /Certificate B &lt;item&gt;/);
  assert.doesNotMatch(html, /Certificate B <item>/);
  assert.match(html, /Valid Until/);
});

test('concurrent Mark Sent rejects PATCH inside transaction before item deletion', async () => {
  let deleted = false, updated = false, audit = false;
  const service = new QuotationsService({
    quotation: { findUnique: async () => quote('DRAFT') }, // stale read before a concurrent send
    $transaction: async (fn) => fn({
      quotation: {
        updateMany: async ({ where }) => { assert.equal(where.status, 'DRAFT'); return { count: 0 }; },
        update: async () => { updated = true; throw Error('must not update SENT'); },
      },
      quotationItem: { deleteMany: async () => { deleted = true; throw Error('must not delete SENT items'); } },
    }),
  }, { write: () => { audit = true; } });
  await assert.rejects(service.update(11n, {
    items: [{ description: 'Illegal replacement', qty: 1, uom: 'EA', unitPrice: 100 }],
  }, 5n), { status: 400 });
  assert.equal(deleted, false);
  assert.equal(updated, false);
  assert.equal(audit, false);
});
