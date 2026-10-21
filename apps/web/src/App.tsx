import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import AdminUsersPage from './pages/AdminUsersPage';
import NewProjectPage from './pages/NewProjectPage';
import PartnersPage from './pages/PartnersPage';
import ProjectPage from './pages/ProjectPage';
import ProjectsPage from './pages/ProjectsPage';

function PrivateApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Memuat aplikasi...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/partners" element={<PartnersPage />} />
        {user.role === "SUPER_ADMIN" && <Route path="/admin/users" element={<AdminUsersPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Memuat aplikasi...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/accept-invite" element={<AcceptInvitationPage />} />
      <Route path="/*" element={<PrivateApp />} />
    </Routes>
  );
}
