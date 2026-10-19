import { FormEvent, useMemo, useState } from 'react';
import { Card, EmptyState, ErrorBox } from '../../components/Ui';
import { StatusBadge } from '../../components/StatusBadge';
import { api, downloadProtected, openProtectedHtml } from '../../lib/api';
import { formatDate, formatMoney, todayInput } from '../../lib/format';
import type { Quotation, QuotationItem } from '../../types';
import type { WorkspaceData } from './useProjectWorkspace';

const blankItem=():QuotationItem=>({description:'',partNumber:'',manufacturer:'',qty:1,uom:'PCS',unitPrice:0});
export function QuotationTab({data,reload}:{data:WorkspaceData;reload:()=>Promise<void>}){
 const [showForm,setShowForm]=useState(false);const [editingId,setEditingId]=useState<string|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [items,setItems]=useState<QuotationItem[]>([blankItem()]);
 const [form,setForm]=useState({quotationDate:todayInput(),validUntil:'',rfqNo:data.project.origin?.externalReference||'',subject:data.project.projectName,taxRate:'',deliveryTerm:'',deliveryTime:'',paymentTerm:'',certificateTerm:'',additionalNotes:''});
 const original=editingId?data.quotations.find(q=>q.id===editingId):undefined;
 const totals=useMemo(()=>{
  const subtotal=items.reduce((s,i)=>s+Number(i.qty||0)*Number(i.unitPrice||0),0);
  const discount=original?.discountRate!=null&&Number(original.discountRate)>0?subtotal*Number(original.discountRate)/100:Number(original?.discountAmount??0);
  const taxBase=Math.max(0,subtotal-discount);
  const tax=taxBase*Number(form.taxRate||0)/100;
  return{subtotal,discount,tax,total:taxBase+tax};
 },[items,form.taxRate,original]);
 function updateItem(index:number,key:string,value:string){setItems(rows=>rows.map((row,i)=>i===index?{...row,[key]:['qty','unitPrice'].includes(key)?Number(value):value}:row));}
 function startNew(){setEditingId(null);setItems([blankItem()]);setForm({quotationDate:todayInput(),validUntil:'',rfqNo:data.project.origin?.externalReference||'',subject:data.project.projectName,taxRate:'',deliveryTerm:'',deliveryTime:'',paymentTerm:'',certificateTerm:'',additionalNotes:''});setError('');setShowForm(true);}
 function startEdit(q:Quotation){
  if(q.status!=='DRAFT')return;
  setEditingId(q.id);setError('');
  setItems(q.items.map(i=>({description:i.description,partNumber:i.partNumber??'',manufacturer:i.manufacturer??'',model:i.model??'',origin:i.origin??'',qty:Number(i.qty),uom:i.uom,unitPrice:Number(i.unitPrice),notes:i.notes??''})));
  setForm({quotationDate:q.quotationDate.slice(0,10),validUntil:q.validUntil?.slice(0,10)||'',rfqNo:q.rfqNo??'',subject:q.subject??'',taxRate:q.taxRate!=null?String(q.taxRate):'',deliveryTerm:q.deliveryTerm??'',deliveryTime:q.deliveryTime??'',paymentTerm:q.paymentTerm??'',certificateTerm:q.certificateTerm??'',additionalNotes:q.additionalNotes??''});
  setShowForm(true);
 }
 function cancelEdit(){setShowForm(false);setEditingId(null);setError('');}
 function itemPayload(i:QuotationItem,n:number){return{lineNo:n+1,description:i.description,partNumber:i.partNumber||undefined,manufacturer:i.manufacturer||undefined,model:i.model||undefined,origin:i.origin||undefined,qty:Number(i.qty),uom:i.uom,unitPrice:Number(i.unitPrice),notes:i.notes||undefined};}
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
   if(editingId&&!data.quotations.some(q=>q.id===editingId&&q.status==='DRAFT'))throw new Error('Quotation sudah terkunci. Buat revisi baru.');
   const payload={...form,validUntil:form.validUntil||(editingId?null:undefined),taxRate:form.taxRate.trim()===''?(editingId?0:undefined):Number(form.taxRate),items:items.map(itemPayload)};
   await api(editingId?`/quotations/${editingId}`:`/projects/${data.project.id}/quotations`,{method:editingId?'PATCH':'POST',body:JSON.stringify(payload)});
   setShowForm(false);setEditingId(null);await reload();
  }catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan draft');}finally{setBusy(false);}
 }
 async function action(id:string,name:string){setError('');try{await api(`/quotations/${id}/${name}`,{method:'POST'});await reload();}catch(e){setError(e instanceof Error?e.message:'Gagal');}}
 async function archive(id:string){setError('');try{await api(`/quotations/${id}/archive-pdf`,{method:'POST'});await reload();}catch(e){setError(e instanceof Error?e.message:'Gagal archive PDF');}}
 return <div className="tab-stack"><ErrorBox error={error}/>
  {data.quotations.length>0 && <Card title="Quotation History">{data.quotations.map(q=><div className="document-row" key={q.id}><div><strong>{q.quotationNo}</strong><span>Rev.{q.revisionNo} · {formatDate(q.quotationDate)} · {formatMoney(q.grandTotal,q.currency)}</span></div><StatusBadge status={q.status}/><div className="row-actions"><button className="btn small" onClick={()=>openProtectedHtml(`/quotations/${q.id}/print-preview`)}>Preview A4</button><button className="btn small" onClick={()=>downloadProtected(`/quotations/${q.id}/pdf`,`${q.quotationNo.replace(/[^A-Za-z0-9._-]+/g,'_')}_Rev${q.revisionNo}.pdf`)}>PDF</button>{q.status!=='DRAFT'&&q.status!=='CANCELLED'&&<button className="btn small" onClick={()=>archive(q.id)}>Archive PDF</button>}{q.status==='DRAFT'&&<><button className="btn small" disabled={busy} onClick={()=>startEdit(q)}>Edit Draft</button><button className="btn primary small" disabled={busy||(showForm&&editingId===q.id)} title={showForm&&editingId===q.id?'Simpan/batalkan perubahan draft terlebih dahulu':undefined} onClick={()=>action(q.id,'send')}>Mark Sent</button></>}{q.status==='SENT'&&<><button className="btn small" onClick={()=>action(q.id,'accept')}>Accepted</button><button className="btn small" onClick={()=>action(q.id,'revise')}>Revisi</button></>}</div></div>)}</Card>}
  {!data.quotations.length&&!showForm&&<EmptyState title="Belum ada quotation" text="Untuk penunjukan langsung, quotation boleh dilewati." action={<button className="btn primary" onClick={startNew}>Buat Quotation</button>}/>} 
  {showForm&&<Card title={editingId?'Edit Draft Quotation':'Buat Quotation'}><form onSubmit={submit} className="form-stack"><div className="form-grid three"><label>Quotation Date<input type="date" required value={form.quotationDate} onChange={e=>setForm({...form,quotationDate:e.target.value})}/></label><label>Valid Until<input type="date" value={form.validUntil} onChange={e=>setForm({...form,validUntil:e.target.value})}/><small className="muted">Masa berlaku penawaran, bukan deadline RFQ customer.</small></label><label>RFQ No.<input value={form.rfqNo} onChange={e=>setForm({...form,rfqNo:e.target.value})}/></label></div><label>Subject<input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>
  <div className="item-editor"><div className="item-editor-head"><strong>Items</strong><button type="button" className="btn small" onClick={()=>setItems([...items,blankItem()])}>+ Item</button></div>{items.map((item,index)=><div className="item-edit-row" key={index}><div className="item-no">{index+1}</div><div className="item-fields"><label>Description<textarea required rows={2} value={item.description} onChange={e=>updateItem(index,'description',e.target.value)}/></label><div className="form-grid four"><label>Part No.<input value={item.partNumber||''} onChange={e=>updateItem(index,'partNumber',e.target.value)}/></label><label>Manufacturer<input value={item.manufacturer||''} onChange={e=>updateItem(index,'manufacturer',e.target.value)}/></label><label>Qty<input type="number" step="0.0001" min="0.0001" value={item.qty} onChange={e=>updateItem(index,'qty',e.target.value)}/></label><label>UoM<input value={item.uom} onChange={e=>updateItem(index,'uom',e.target.value)}/></label></div><label>Unit Price<input type="number" step="0.01" min="0" value={item.unitPrice} onChange={e=>updateItem(index,'unitPrice',e.target.value)}/></label><label>Catatan per item<textarea rows={2} value={item.notes||''} onChange={e=>updateItem(index,'notes',e.target.value)} placeholder="Instruksi atau keterangan khusus untuk barang ini"/></label></div>{items.length>1&&<button type="button" className="icon-btn danger-text" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>×</button>}</div>)}</div>
  <div className="form-grid three"><label>VAT / Tax Rate %<input type="number" step="0.0001" value={form.taxRate} onChange={e=>setForm({...form,taxRate:e.target.value})}/></label><label>Delivery Time<input value={form.deliveryTime} onChange={e=>setForm({...form,deliveryTime:e.target.value})}/></label><label>Payment Term<input value={form.paymentTerm} onChange={e=>setForm({...form,paymentTerm:e.target.value})}/></label></div><label>Delivery / Price Term<input value={form.deliveryTerm} onChange={e=>setForm({...form,deliveryTerm:e.target.value})}/></label><label>Certificate / Documentation<input value={form.certificateTerm} onChange={e=>setForm({...form,certificateTerm:e.target.value})}/></label><label>Additional Notes<textarea rows={3} value={form.additionalNotes} onChange={e=>setForm({...form,additionalNotes:e.target.value})}/></label><div className="calc-box"><span>Subtotal <strong>{formatMoney(totals.subtotal)}</strong></span>{totals.discount>0&&<span>Discount <strong>{formatMoney(totals.discount)}</strong></span>}<span>Tax <strong>{formatMoney(totals.tax)}</strong></span><span>Total <strong>{formatMoney(totals.total)}</strong></span></div><div className="form-actions"><button type="button" className="btn" onClick={cancelEdit}>Batal</button><button className="btn primary" disabled={busy}>{busy?'Menyimpan...':editingId?'Simpan Perubahan Draft':'Simpan Draft Quotation'}</button></div></form></Card>}
 </div>;
}
