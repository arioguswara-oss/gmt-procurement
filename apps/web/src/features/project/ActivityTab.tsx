import { Card, EmptyState } from '../../components/Ui';
import { formatDateTime } from '../../lib/format';
import type { WorkspaceData } from './useProjectWorkspace';
export function ActivityTab({data}:{data:WorkspaceData}){return <Card title="Activity / Audit Trail">{data.activity.length?<div className="timeline">{data.activity.map(a=><div className="timeline-item" key={a.id}><div className="timeline-dot"/><div><strong>{a.description}</strong><span>{formatDateTime(a.createdAt)} · {a.user?.name||'System'} · {a.entityType}</span></div></div>)}</div>:<EmptyState title="Belum ada activity"/>}</Card>}
