import { FormEvent, useState } from 'react';
import { Card, ErrorBox } from '../../components/Ui';
import { downloadProtected, upload } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { WorkspaceData } from './useProjectWorkspace';
const types=['ORIGINAL_EMAIL','RFQ_ATTACHMENT','ORIGINAL_PO','SIGNED_DO','RECEIVING_DOCUMENT','TAX_INVOICE','PAYMENT_PROOF','OTHER'];
export function DocumentsTab({data,reload}:{data:WorkspaceData;reload:()=>Promise<void>}){
 const [file,setFile]=useState<File|null>(null);const [documentType,setDocumentType]=useState('OTHER');const [notes,setNotes]=useState('');const [error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();if(!file)return;setError('');try{const f=new FormData();f.append('file',file);f.append('documentType',documentType);if(notes)f.append('notes',notes);await upload(`/projects/${data.project.id}/documents`,f);setFile(null);setNotes('');await reload();}catch(e){setError(e instanceof Error?e.message:'Upload gagal');}}
 return <div className="tab-stack"><ErrorBox error={error}/><Card title="Upload Dokumen"><form className="inline-form" onSubmit={submit}><select value={documentType} onChange={e=>setDocumentType(e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select><input type="file" required onChange={e=>setFile(e.target.files?.[0]||null)}/><input placeholder="Catatan (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/><button className="btn primary">Upload</button></form></Card><Card title="Document Archive"><div className="table-wrap"><table><thead><tr><th>Type</th><th>File</th><th>Uploaded</th><th></th></tr></thead><tbody>{data.documents.map(d=><tr key={d.id}><td>{d.documentType}</td><td><strong>{d.originalFilename}</strong><small className="block muted">{d.notes}</small></td><td>{formatDateTime(d.uploadedAt)}</td><td><button className="btn small" onClick={()=>downloadProtected(`/documents/${d.id}/download`,d.originalFilename)}>Download</button></td></tr>)}</tbody></table></div></Card></div>;
}
