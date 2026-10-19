import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBox, PageHeader } from '../components/Ui';
import { api } from '../lib/api';
import { todayInput } from '../lib/format';
import type { Partner, Project } from '../types';

const sources = ['RFQ_EMAIL','TENDER','DIRECT_APPOINTMENT','DIRECT_PO','REPEAT_ORDER','OTHER'];

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ gmtReference:'', projectName:'', sourceType:'RFQ_EMAIL', customerId:'', notes:'', externalReference:'', emailSubject:'', senderName:'', senderEmail:'', receivedAt:todayInput(), quotationDeadline:'' });
  useEffect(() => { api<Partner[]>('/business-partners').then(setPartners).catch((e) => setError(e.message)); }, []);
  function set(name:string, value:string) { setForm((f) => ({ ...f, [name]: value })); }
  async function submit(e:FormEvent) { e.preventDefault(); setError(''); setBusy(true); try {
    const originEnabled = ['RFQ_EMAIL','TENDER'].includes(form.sourceType) || form.externalReference || form.emailSubject;
    const payload:any = { gmtReference:form.gmtReference, projectName:form.projectName, sourceType:form.sourceType, customerId:form.customerId, notes:form.notes || undefined };
    if (originEnabled) payload.origin = { externalReference:form.externalReference || undefined, emailSubject:form.emailSubject || undefined, senderName:form.senderName || undefined, senderEmail:form.senderEmail || undefined, receivedAt:form.receivedAt || undefined, quotationDeadline:form.quotationDeadline || undefined };
    const project = await api<Project>('/projects', { method:'POST', body:JSON.stringify(payload) }); navigate(`/projects/${project.id}`);
  } catch(e) { setError(e instanceof Error ? e.message : 'Gagal membuat project'); } finally { setBusy(false); } }
  return <>
    <PageHeader title="Project Baru" subtitle="GMT Master Reference ditetapkan di awal dan diteruskan ke dokumen berikutnya." />
    <ErrorBox error={error} />
    <form className="card form-card" onSubmit={submit}>
      <div className="form-grid two">
        <label>GMT Master Reference<input required placeholder="contoh: GMT-2026-09-1687-EMT" value={form.gmtReference} onChange={(e)=>set('gmtReference',e.target.value)} /></label>
        <label>Nama Project<input required placeholder="Electrical Spare Parts" value={form.projectName} onChange={(e)=>set('projectName',e.target.value)} /></label>
        <label>Source<select value={form.sourceType} onChange={(e)=>set('sourceType',e.target.value)}>{sources.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Customer<select required value={form.customerId} onChange={(e)=>set('customerId',e.target.value)}><option value="">Pilih customer...</option>{partners.map(p=><option value={p.id} key={p.id}>{p.companyName}</option>)}</select></label>
      </div>
      <h3 className="form-section-title">Origin / Referensi Masuk</h3>
      <div className="form-grid two">
        <label>RFQ / External Reference<input value={form.externalReference} onChange={(e)=>set('externalReference',e.target.value)} /></label>
        <label>Email Subject<input value={form.emailSubject} onChange={(e)=>set('emailSubject',e.target.value)} /></label>
        <label>Sender Name<input value={form.senderName} onChange={(e)=>set('senderName',e.target.value)} /></label>
        <label>Sender Email<input type="email" value={form.senderEmail} onChange={(e)=>set('senderEmail',e.target.value)} /></label>
        <label>Received Date<input type="date" value={form.receivedAt} onChange={(e)=>set('receivedAt',e.target.value)} /></label>
        <label>Quotation Deadline<input type="date" value={form.quotationDeadline} onChange={(e)=>set('quotationDeadline',e.target.value)} /></label>
      </div>
      <label>Catatan<textarea rows={3} value={form.notes} onChange={(e)=>set('notes',e.target.value)} /></label>
      <div className="form-actions"><button className="btn primary" disabled={busy}>{busy?'Menyimpan...':'Buat Project'}</button></div>
    </form>
  </>;
}
