import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';

export function AppLayout() {
  const { session, logout } = useAuth();
  const role = session?.role;
  const canAnalyze = role === 'HR_MANAGER' || role === 'HR_VIEWER';
  const canAudit = role === 'HR_MANAGER' || role === 'AUDITOR';

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav>
          <NavLink to="/employees">Employees</NavLink>
          {canAnalyze ? <NavLink to="/analytics">Analytics</NavLink> : null}
          {canAnalyze ? <NavLink to="/questions">Questions</NavLink> : null}
          {canAudit ? <NavLink to="/audit">Audit</NavLink> : null}
        </nav>
        <div>
          <span>{session?.email}</span>{' '}
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
