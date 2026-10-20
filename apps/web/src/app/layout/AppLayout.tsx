import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAuth } from '../../features/auth/auth-context';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-white no-underline ${isActive ? 'underline' : ''}`;

export function AppLayout() {
  const { session, logout } = useAuth();
  const role = session?.role;
  const canAnalyze = role === 'HR_MANAGER' || role === 'HR_VIEWER';
  const canAudit = role === 'HR_MANAGER' || role === 'AUDITOR';

  return (
    <div className="min-h-screen">
      <header className="flex flex-col gap-3 bg-topbar px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NavLink to="/employees" className={navClass}>
            Employees
          </NavLink>
          {canAnalyze ? (
            <NavLink to="/analytics" className={navClass}>
              Analytics
            </NavLink>
          ) : null}
          {canAnalyze ? (
            <NavLink to="/questions" className={navClass}>
              Questions
            </NavLink>
          ) : null}
          {canAudit ? (
            <NavLink to="/audit" className={navClass}>
              Audit
            </NavLink>
          ) : null}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <span className="min-w-0 break-all text-sm">{session?.email}</span>
          <ThemeToggle variant="topbar" />
          <button
            type="button"
            className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-sm text-topbar"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-5">
        <Outlet />
      </main>
    </div>
  );
}
