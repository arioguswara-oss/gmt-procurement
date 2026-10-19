export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="header-actions">{actions}</div></div>;
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>
    {(title || action) && <div className="card-head">{title ? <h2>{title}</h2> : <span />}{action}</div>}
    {children}
  </section>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong>{text && <p>{text}</p>}{action}</div>;
}

export function ErrorBox({ error }: { error?: string | null }) {
  return error ? <div className="alert danger">{error}</div> : null;
}

export function SuccessBox({ message }: { message?: string | null }) {
  return message ? <div className="alert success">{message}</div> : null;
}
