'use strict';
// Compiled services, in-memory mocks only. Never boots Nest or connects to a DB.
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { TaxDocumentsService } = require('../apps/api/dist/tax-documents/tax-documents.service');
const { assertInvoicePrintable } = require('../apps/api/dist/common/print/tax-invoice-print-gate');
const { DocumentsService } = require('../apps/api/dist/documents/documents.service');
const { InvoicePrintService } = require('../apps/api/dist/invoices/invoice-print.service');
const { ReceiptPrintService } = require('../apps/api/dist/receipts/receipt-print.service');
const { BillingPackagePdfService } = require('../apps/api/dist/invoices/billing-package-pdf.service');
const proof = overrides => ({status:'VERIFIED',verifiedById:7n,verifiedAt:new Date(),documents:[{documentType:'TAX_INVOICE'}],...overrides});
const invoice = tax => ({id:9n,projectId:3n,status:'FINAL',taxDocuments:[tax]});
function harness({configured='7',active=true,role='OPERATIONS',count=1,auditFails=false}={}) {
  const seen={writes:0,audits:0};
  const tx={taxDocument:{
    updateMany:async ({where,data})=>{seen.writes++;assert.equal(where.id,6n);assert.equal(where.invoiceId,9n);assert.equal(where.status,'UPLOADED');assert.equal(where.invoice.status.not,'CANCELLED');assert.equal(where.documents.some.invoiceId,9n);assert.equal(data.status,'VERIFIED');assert.equal(data.verifiedById,7n);assert.ok(data.verifiedAt instanceof Date);return {count}},
    findUniqueOrThrow:async ()=>({id:6n,invoice:{projectId:3n},documents:[]}),
  },activityLog:{create:async ({data})=>{seen.audits++;assert.equal(data.userId,7n);assert.equal(data.action,'VERIFIED');assert.equal(data.newValuesJson.verifiedById,'7');if(auditFails)throw Error('audit unavailable');return data}}};
  const prisma={user:{findUnique:async()=>({active,role})},$transaction:async fn=>fn(tx)};
  return {seen,service:new TaxDocumentsService(prisma,{}, {},{get:()=>configured})};
}
test('UPLOADED never unlocks print even with fabricated verification metadata',()=>{
  assert.throws(()=>assertInvoicePrintable(invoice(proof({status:'UPLOADED'}))),{status:400});
});
test('VERIFIED requires both verifier identity and valid timestamp',()=>{
  for(const overrides of [{verifiedById:null},{verifiedById:0n},{verifiedAt:null},{verifiedAt:new Date('invalid')}])
    assert.throws(()=>assertInvoicePrintable(invoice(proof(overrides))),{status:400});
  assert.doesNotThrow(()=>assertInvoicePrintable(invoice(proof())));
});
test('unset or malformed verifier configuration fails closed before writes',async()=>{
  for(const configured of ['', 'name', '0', '7,8']){const h=harness({configured});await assert.rejects(h.service.verify(9n,6n,7n),{status:403});assert.equal(h.seen.writes,0)}
});
test('another user including an admin cannot impersonate assigned verifier',async()=>{
  const h=harness({role:'SUPER_ADMIN'});await assert.rejects(h.service.verify(9n,6n,8n),{status:403});assert.equal(h.seen.writes,0);
});
test('inactive and read-only designated users cannot verify',async()=>{
  for(const options of [{active:false},{role:'VIEWER'}]){const h=harness(options);await assert.rejects(h.service.verify(9n,6n,7n),{status:403});assert.equal(h.seen.writes,0)}
});
test('explicit verifier writes server identity/time and audit in transaction',async()=>{
  const h=harness();await h.service.verify(9n,6n,7n);assert.equal(h.seen.writes,1);assert.equal(h.seen.audits,1);
});
test('stale, replaced, already verified or wrong-invoice conditional update rejects',async()=>{
  const h=harness({count:0});await assert.rejects(h.service.verify(9n,6n,7n),{status:400});assert.equal(h.seen.audits,0);
});
test('audit failure propagates out of transaction instead of reporting verification success',async()=>{
  const h=harness({auditFails:true});await assert.rejects(h.service.verify(9n,6n,7n),/audit unavailable/);
});
test('all archived billing types reject merely uploaded proof before filesystem access',async()=>{
  for(const documentType of ['INVOICE_PDF','RECEIPT_PDF','BILLING_PACKAGE_PDF']){
    const s=new DocumentsService({document:{findUnique:async()=>({documentType,invoiceId:9n,projectId:3n})},invoice:{findUnique:async()=>invoice(proof({status:'UPLOADED'}))}}, {}, {});
    await assert.rejects(s.download(1n),{status:400});
    await assert.rejects(s.storeGenerated({documentType,invoiceId:9n,projectId:3n}),{status:400});
  }
});
test('uploaded proof blocks both HTML renderers and billing PDF build/archive before side effects',async()=>{
  const row=invoice(proof({status:'UPLOADED'}));
  const inv=new InvoicePrintService({get:async()=>row},{});
  const receipt=new ReceiptPrintService({get:async()=>({status:'FINAL',invoice:row})},{});
  const bundle=new BillingPackagePdfService({get:async()=>row},{},{},{},{},{});
  await assert.rejects(inv.render(9n),{status:400});
  await assert.rejects(receipt.render(1n),{status:400});
  await assert.rejects(bundle.build(9n),{status:400});
  await assert.rejects(bundle.archive(9n,7n),{status:400});
});
test('generic invoice archive upload cannot bypass human verification',async()=>{
  const s=new DocumentsService({project:{findUnique:async()=>({id:3n})},invoice:{findFirst:async()=>({id:9n}),findUnique:async()=>invoice(proof({status:'UPLOADED'}))}}, {}, {});
  await assert.rejects(s.upload(3n,{documentType:'INVOICE_PDF',invoiceId:'9'},{},7n),{status:400});
});
