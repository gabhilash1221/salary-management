import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { roleLabel } from '../../i18n/catalog';
import { useI18n } from '../../i18n/locale-context';
import { useAuth } from '../auth/auth-context';

type AuditRow = {
  id: string;
  timestamp: string;
  actorRole: string;
  action: string;
  entityId: string;
  reason: string | null;
};

export function AuditPage() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const audit = useQuery({
    queryKey: ['audit'],
    queryFn: () =>
      apiFetch<{ items: AuditRow[] }>('/api/v1/audit', {}, session?.token),
  });

  if (audit.isLoading) return <LoadingState />;
  if (audit.isError)
    return (
      <ErrorState
        message={
          audit.error instanceof Error
            ? audit.error.message
            : t('audit.loadError')
        }
      />
    );

  return (
    <section>
      <h1 className="mb-4 text-2xl">{t('audit.title')}</h1>
      <DataTable
        caption={t('audit.caption')}
        emptyMessage={t('audit.empty')}
        rows={audit.data?.items ?? []}
        columns={[
          {
            key: 'time',
            header: t('audit.when'),
            render: (row) => row.timestamp,
          },
          {
            key: 'action',
            header: t('audit.action'),
            render: (row) => row.action,
          },
          {
            key: 'actor',
            header: t('audit.actor'),
            render: (row) => roleLabel(locale, row.actorRole),
          },
          {
            key: 'entity',
            header: t('import.employee'),
            render: (row) => row.entityId,
          },
          {
            key: 'reason',
            header: t('salary.reason'),
            render: (row) => row.reason ?? '—',
          },
        ]}
      />
    </section>
  );
}
