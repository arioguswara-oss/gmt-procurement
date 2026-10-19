import { FormEvent, useEffect, useState } from 'react';
import { Card, ErrorBox, PageHeader, SuccessBox } from '../components/Ui';
import { api } from '../lib/api';
import type { Partner } from '../types';

export default function PartnersPage() {
  const [partners,setPartners]=useState<Partner[]>([]); const [error,setError]=useState(''); const [success,setSuccess]=useState('');
  const [form,setForm]=useState({companyName:'',partnerCode:'',email:'',phone:'',address:'',city:'',province:'',postalCode:'',country:'Indonesia'});
  async function load(){ try{setPartners(await api<Partner[]>('/business-partners'));}catch(e){setError(e instanceof Error?e.message:'Gagal');} }
  useEffect(()=>{load();},[]);
  async function submit(e:FormEvent){e.preventDefault();setError('');setSuccess('');try{await api('/business-partners',{method:'POST',body:JSON.stringify(form)});setForm({companyName:'',partnerCode:'',email:'',phone:'',address:'',city:'',province:'',postalCode:'',country:'Indonesia'});setSuccess('Business partner berhasil ditambahkan.');load();}catch(e){setError(e instanceof Error?e.message:'Gagal');}}
  return <><PageHeader title="Customers / Partners" subtitle="Buyer, Bill To, Ship To dan Receiving Party dapat berbeda." /><ErrorBox error={error}/><SuccessBox message={success}/>
  <div className="split-layout"><Card title="Daftar Partner"><div className="table-wrap"><table><thead><tr><th>Perusahaan</th><th>Kode</th><th>Kota</th><th>Kontak</th></tr></thead><tbody>{partners.map(p=><tr key={p.id}><td><strong>{p.companyName}</strong><small className="block muted">{p.address}</small></td><td>{p.partnerCode||'-'}</td><td>{p.city||'-'}</td><td>{p.email||p.phone||'-'}</td></tr>)}</tbody></table></div></Card>
  <Card title="Tambah Partner"><form className="form-stack" onSubmit={submit}><label>Nama Perusahaan<input required value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})}/></label><div className="form-grid two"><label>Kode<input value={form.partnerCode} onChange={e=>setForm({...form,partnerCode:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label></div><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Alamat<textarea rows={3} value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><div className="form-grid two"><label>Kota<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>Provinsi<input value={form.province} onChange={e=>setForm({...form,province:e.target.value})}/></label></div><button className="btn primary">Simpan Partner</button></form></Card></div></>;
}
