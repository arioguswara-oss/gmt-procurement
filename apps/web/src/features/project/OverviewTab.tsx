import { Card } from '../../components/Ui';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, formatDateTime, humanize } from '../../lib/format';
import type { WorkspaceData } from './useProjectWorkspace';

export function OverviewTab({ data }: { data: WorkspaceData }) {
  const {project,quotations,purchaseOrders,deliveryOrders,invoices}=data;
  const latestQuote=[...quotations].sort((a,b)=>b.revisionNo-a.revisionNo)[0];
  return <div className="tab-stack">
    <div className="overview-grid">
      <Card title="Project"><dl className="detail-list"><div><dt>GMT Reference</dt><dd>{project.gmtReference}</dd></div><div><dt>Customer</dt><dd>{project.customer.companyName}</dd></div><div><dt>Source</dt><dd>{humanize(project.sourceType)}</dd></div><div><dt>Owner</dt><dd>{project.projectOwner?.name||'-'}</dd></div><div><dt>Created</dt><dd>{formatDateTime(project.createdAt)}</dd></div></dl></Card>
      <Card title="Project Origin"><dl className="detail-list"><div><dt>External Ref / RFQ</dt><dd>{project.origin?.externalReference||'-'}</dd></div><div><dt>Sender</dt><dd>{project.origin?.senderName||'-'}</dd></div><div><dt>Received</dt><dd>{formatDate(project.origin?.receivedAt)}</dd></div><div><dt>Quotation Deadline</dt><dd>{formatDate(project.origin?.quotationDeadline)}</dd></div></dl></Card>
    </div>
    <div className="workflow-row">
      <div><span>Quotation</span><strong>{latestQuote?`Rev.${latestQuote.revisionNo}`:'-'}</strong>{latestQuote?<StatusBadge status={latestQuote.status}/>:<small>optional</small>}</div>
      <div><span>PO Customer</span><strong>{purchaseOrders.length}</strong><small>dokumen</small></div>
      <div><span>Delivery Order</span><strong>{deliveryOrders.length}</strong><small>{deliveryOrders.filter(d=>d.status==='RECEIVED').length} received</small></div>
      <div><span>Invoice</span><strong>{invoices.length}</strong><small>{invoices.filter(i=>i.status==='FINAL').length} final</small></div>
    </div>
    {project.notes && <Card title="Catatan Project"><p className="preline">{project.notes}</p></Card>}
  </div>;
}
