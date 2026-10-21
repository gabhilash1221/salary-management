import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { Profile } from '../../api/types';
import { LocaleSwitch } from '../../components/LocaleSwitch';
import { ThemeToggle } from '../../components/ThemeToggle';
import { UserAvatar } from '../../components/UserAvatar';
import { useAuth } from '../../features/auth/auth-context';
import { useI18n } from '../../i18n/locale-context';

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-2.5 py-1 text-sm font-medium no-underline',
    isActive
      ? 'bg-brand !text-white hover:bg-brand dark:bg-white dark:!text-topbar'
      : '!text-ink hover:bg-canvas dark:!text-white dark:hover:bg-white/10',
  ].join(' ');

export function AppLayout() {
  const { session, logout } = useAuth();
  const { t } = useI18n();
  const role = session?.role;
  const profile = useQuery({
    queryKey: ['profile'],
    enabled: Boolean(session?.token),
    queryFn: () => apiFetch<Profile>('/api/v1/auth/me', {}, session?.token),
  });
  const canAnalyze = role === 'HR_MANAGER' || role === 'HR_VIEWER';
  const canAudit = role === 'HR_MANAGER' || role === 'AUDITOR';

  return (
    <div className="min-h-screen">
      <header className="flex flex-col gap-3 border-b border-line bg-surface px-4 py-3 text-ink sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-transparent dark:bg-topbar dark:text-white">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NavLink to="/employees" className={navClass}>
            {t('nav.employees')}
          </NavLink>
          {canAnalyze ? (
            <NavLink to="/analytics" className={navClass}>
              {t('nav.analytics')}
            </NavLink>
          ) : null}
          {canAnalyze ? (
            <NavLink to="/questions" className={navClass}>
              {t('nav.questions')}
            </NavLink>
          ) : null}
          {canAudit ? (
            <NavLink to="/audit" className={navClass}>
              {t('nav.audit')}
            </NavLink>
          ) : null}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <Link
            to="/profile"
            className="flex min-w-0 items-center gap-2 !text-inherit no-underline"
            aria-label={t('nav.profile')}
          >
            <UserAvatar
              name={profile.data?.displayName || session?.email || ''}
              email={session?.email}
              token={session?.token}
              hasAvatar={profile.data?.hasAvatar}
              revision={profile.dataUpdatedAt}
            />
            <span className="min-w-0 break-all text-sm">{session?.email}</span>
          </Link>
          <LocaleSwitch variant="topbar" />
          <ThemeToggle variant="topbar" />
          <button
            type="button"
            className="cursor-pointer rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink dark:border-transparent dark:bg-white dark:text-topbar"
            onClick={logout}
          >
            {t('nav.signOut')}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-5">
        <Outlet />
      </main>
    </div>
  );
}
