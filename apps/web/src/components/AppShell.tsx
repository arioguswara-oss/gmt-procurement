import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">GM</div>
          <div><strong>Gayuh Mandala</strong><span>Procurement</span></div>
        </div>
        <nav className="side-nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/partners">Customers / Partners</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="user-card"><strong>{user?.name}</strong><span>{user?.role?.replaceAll('_', ' ')}</span></div>
          <button className="btn ghost wide" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  );
}
