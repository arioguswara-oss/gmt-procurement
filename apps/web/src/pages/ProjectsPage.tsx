import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBox, PageHeader } from '../components/Ui';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDate, humanize } from '../lib/format';
import type { Project } from '../types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load(q = '') { setLoading(true); setError(''); try { setProjects(await api<Project[]>(`/projects${q ? `?search=${encodeURIComponent(q)}` : ''}`)); } catch(e) { setError(e instanceof Error ? e.message : 'Gagal'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return <>
    <PageHeader title="Projects" subtitle="Semua pekerjaan menggunakan satu GMT Master Reference" actions={<Link className="btn primary" to="/projects/new">+ Project Baru</Link>} />
    <div className="toolbar"><input className="search" placeholder="Cari GMT Reference, project atau customer..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(search)} /><button className="btn" onClick={() => load(search)}>Cari</button></div>
    <ErrorBox error={error} />
    <div className="card table-card"><div className="table-wrap"><table><thead><tr><th>GMT Reference</th><th>Project</th><th>Customer</th><th>Source</th><th>Status</th><th>Created</th></tr></thead><tbody>
      {projects.map((p) => <tr key={p.id}><td><Link className="strong-link" to={`/projects/${p.id}`}>{p.gmtReference}</Link></td><td>{p.projectName}</td><td>{p.customer?.companyName}</td><td>{humanize(p.sourceType)}</td><td><StatusBadge status={p.workflowStatus} /></td><td>{formatDate(p.createdAt)}</td></tr>)}
    </tbody></table></div>{loading && <div className="table-loading">Memuat...</div>}</div>
  </>;
}
