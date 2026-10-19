import { humanize } from '../lib/format';

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status || 'UNKNOWN').toLowerCase();
  return <span className={`status status-${key}`}>{humanize(status)}</span>;
}
