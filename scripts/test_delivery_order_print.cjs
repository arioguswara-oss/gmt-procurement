// Run AFTER API build: node --test scripts/test_delivery_order_print.cjs
// No database, network, application bootstrap or credentials. Mock-only regression.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DeliveryOrderPrintService } = require('../apps/api/dist/delivery-orders/delivery-order-print.service');
const { DeliveryOrdersService } = require('../apps/api/dist/delivery-orders/delivery-orders.service');
const { Prisma } = require('@prisma/client');

const d = (value) => new Prisma.Decimal(value);
function makeDo(overrides = {}) {
  return {
    doNo: 'DO-TEST', doDate: new Date('2026-10-20'), status: 'ISSUED',
    deliveryAddress: 'Actual Warehouse, Jepara', deliveryContact: 'Warehouse PIC',
    notes: 'Confirm receipt', sellerSnapshot: null, receiverSnapshot: { companyName: 'Receiving Company', address: 'Registered Office, Jakarta', city: 'Jakarta' },
    purchaseOrder: { poNo: 'PO-TEST', project: { gmtReference: 'GMT-TEST' },
      receivingParty: { companyName: 'Receiving Company', address: 'Registered Office, Jakarta', city: 'Jakarta' },
      shipTo: null, buyer: { companyName: 'Buyer', address: 'Buyer Office' } },
    ...overrides,
  };
}
function matrix() {
  return [
    { lineNo: 1, description: 'Circuit breaker', qtyOrdered: d(3), uom: 'EA',
      previouslyDelivered: d(1), thisDelivery: d(2), balanceAfterThisDo: d(0), marked: true, notes: 'Handle & test <before shipping>' },
    { lineNo: 2, description: 'Not in current DO', qtyOrdered: d(5), uom: 'EA',
      previouslyDelivered: d(0), thisDelivery: d(0), balanceAfterThisDo: d(5), marked: false, notes: null },
  ];
}
async function render(row) {
  const print = new DeliveryOrderPrintService(
    { get: async () => row, deliveryMatrix: async () => matrix() },
    { companyProfile: { findFirst: async () => ({ companyName: 'PT Gayuh Mandala Teknika', email: 'marketing@example.invalid', phone: '+62 10' }) } },
  );
  return print.render(1n);
}
test('explicit delivery address takes priority over receiver registered address', async () => {
  const html = await render(makeDo());
  assert.match(html, /Actual Warehouse, Jepara/);
  assert.doesNotMatch(html, /Registered Office, Jakarta/);
  assert.match(html, /Warehouse PIC/);
});
test('DO displays correct company contact and per-item notes with HTML escaping', async () => {
  const html = await render(makeDo());
  assert.match(html, /marketing@example.invalid/);
  assert.match(html, /Tel: \+62 10/);
  assert.match(html, /Handle &amp; test &lt;before shipping&gt;/);
  assert.doesNotMatch(html, /<before shipping>/);
  assert.match(html, /Description of Goods Delivered/);
  assert.match(html, /Circuit breaker/);
  assert.doesNotMatch(html, /Not in current DO/); // never imply undelivered goods were received
  assert.doesNotMatch(html, /<th[^>]*>Balance<\/th>/);
});
test('draft DO is visibly watermarked and has signature spaces', async () => {
  const html = await render(makeDo({ status: 'DRAFT' }));
  assert.match(html, /class="watermark">DRAFT/);
  assert.match(html, /Delivered By/);
  assert.match(html, /Received By/);
  assert.match(html, /Name \/ Signature \/ Stamp/);
});
test('without custom address prints receiving-party registered address', async () => {
  const html = await render(makeDo({ deliveryAddress: null }));
  assert.match(html, /Registered Office, Jakarta/);
});

test('DO matrix retains current-line notes without changing partial-delivery quantities', async () => {
  const current = {
    purchaseOrderId: 3n, items: [{ purchaseOrderItemId: 10n, qtyDelivered: d(2), notes: 'Current item label' }],
  };
  const service = new DeliveryOrdersService({}, {}, {});
  service.get = async () => current;
  service.poForDelivery = async () => ({
    items: [{
      id: 10n, lineNo: 1, description: 'Breaker', partNumber: null, manufacturer: null,
      qtyOrdered: d(5), uom: 'EA',
      deliveryItems: [{
        deliveryOrder: { id: 2n, status: 'RECEIVED' }, qtyDelivered: d(1),
      }],
    }],
  });
  const rows = await service.deliveryMatrix(1n);
  assert.equal(rows[0].notes, 'Current item label');
  assert.equal(rows[0].thisDelivery.toString(), '2');
  assert.equal(rows[0].previouslyDelivered.toString(), '1');
  assert.equal(rows[0].balanceAfterThisDo.toString(), '2');
});

test('partial DO print contains only this shipment quantity, not PO or previous totals', async () => {
  const html = await render(makeDo());
  assert.match(html, /<td class="r strong">2<\/td>/);
  assert.doesNotMatch(html, /<td class="r strong">3<\/td>/);
  assert.doesNotMatch(html, /<th[^>]*>Previous<\/th>/);
  assert.match(html, /Remaining PO quantities are tracked separately/);
});
