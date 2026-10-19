// Run after API build: node --test scripts/test_quotation_header.cjs
// Mocked database, network-free. The displayed sender is the origin sender, not the GMT preparer.
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Prisma } = require('@prisma/client');
const { QuotationPrintService } = require('../apps/api/dist/quotations/quotation-print.service');
const d = n => new Prisma.Decimal(n);
function quotation(origin, contact = null) {
  return {
    status: 'DRAFT', quotationNo: 'GMT-QA', revisionNo: 0, quotationDate: new Date('2026-10-20'),
    validUntil: new Date('2026-11-20'), currency: 'IDR', subject: 'Spare parts', rfqNo: 'RFQ-123',
    project: { projectName: 'Spare parts', origin },
    customer: { companyName: 'Buyer <A>', address: null, city: null, province: null, postalCode: null, phone: null },
    customerContact: contact, createdBy: { name: 'GMT <Staff>' },
    items: [{ lineNo: 1, description: 'Breaker', qty: d(1), uom: 'PCS', unitPrice: d(500), lineTotal: d(500), notes: null }],
    subtotal: d(500), discountRate: null, discountAmount: d(0), taxRate: null, taxBase: d(500), taxAmount: d(0), grandTotal: d(500),
    deliveryTime: null, certificateTerm: null, paymentTerm: null, deliveryTerm: null, additionalNotes: null,
    sellerSnapshot: null, customerSnapshot: null, signatorySnapshot: null,
  };
}
async function render(row) {
  return new QuotationPrintService({ get: async () => row }, { companyProfile: { findFirst: async () => ({ companyName: 'GMT', email: 'marketing@example.invalid', defaultSignatoryName: 'Director' }) } }).render(11n);
}
test('customer sender is labeled separately from customer PIC and GMT preparer', async () => {
  const html = await render(quotation({ senderName: 'Sender & Co' }, { name: 'Purchasing PIC' }));
  assert.match(html, /<span class="label">Sender Name<\/span> Sender &amp; Co/);
  assert.match(html, /<span class="label">Attention \/ PIC<\/span> Purchasing PIC/);
  assert.match(html, /Prepared by: GMT &lt;Staff&gt;/);
  assert.doesNotMatch(html, /Sender Name<\/span> GMT/);
});
test('sender and PIC are escaped, never inserted as raw HTML', async () => {
  const html = await render(quotation({ senderName: '<script>alert(1)</script>' }, { name: '<img src=x>' }));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});
test('sender absent uses dash and leaves space for a real signature/stamp', async () => {
  const html = await render(quotation(null));
  assert.match(html, /Sender Name<\/span> -/);
  assert.match(html, /Signature \/ Company Stamp/);
  assert.doesNotMatch(html, /Attention \/ PIC/);
});
