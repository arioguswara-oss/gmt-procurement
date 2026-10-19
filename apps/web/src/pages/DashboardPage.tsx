import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, ErrorBox, PageHeader } from '../components/Ui';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Project } from '../types';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api<Project[]>('/projects').then(setProjects).catch((e) => setError(e.message)); }, []);
  const counts = useMemo(() => ({
    open: projects.filter((p) => ['OPEN','QUOTATION_DRAFT','QUOTATION_SENT','QUOTATION_ACCEPTED','PO_RECEIVED'].includes(p.workflowStatus)).length,
    delivery: projects.filter((p) => ['PARTIALLY_DELIVERED','FULLY_DELIVERED'].includes(p.workflowStatus)).length,
    invoice: projects.filter((p) => ['INVOICE_DRAFT','INVOICED'].includes(p.workflowStatus)).length,
    paid: projects.filter((p) => p.workflowStatus === 'PAID').length,
  }), [projects]);

  return <>
    <PageHeader title="Dashboard" subtitle="Ringkasan pekerjaan PT Gayuh Mandala Teknika" actions={<Link className="btn primary" to="/projects/new">+ Project Baru</Link>} />
    <ErrorBox error={error} />
    <div className="stats-grid">
      <div className="stat-card"><span>Project Aktif</span><strong>{counts.open}</strong><small>RFQ, quotation & PO</small></div>
      <div className="stat-card"><span>Delivery</span><strong>{counts.delivery}</strong><small>Partial / full delivery</small></div>
      <div className="stat-card"><span>Billing</span><strong>{counts.invoice}</strong><small>Draft / final invoice</small></div>
      <div className="stat-card"><span>Paid</span><strong>{counts.paid}</strong><small>Project lunas</small></div>
    </div>
    <Card title="Project Terbaru" action={<Link to="/projects" className="text-link">Lihat semua</Link>}>
      <div className="table-wrap"><table><thead><tr><th>GMT Reference</th><th>Project</th><th>Customer</th><th>Status</th><th>Dibuat</th></tr></thead>
      <tbody>{projects.slice(0, 8).map((p) => <tr key={p.id}><td><Link className="strong-link" to={`/projects/${p.id}`}>{p.gmtReference}</Link></td><td>{p.projectName}</td><td>{p.customer?.companyName}</td><td><StatusBadge status={p.workflowStatus} /></td><td>{formatDate(p.createdAt)}</td></tr>)}</tbody></table></div>
      {!projects.length && <div className="empty-state"><strong>Belum ada project</strong><p>Buat project pertama untuk memulai workflow.</p></div>}
    </Card>
  </>;
}
