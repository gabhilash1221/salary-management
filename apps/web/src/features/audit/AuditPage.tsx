import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
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
            : 'Could not load the audit trail'
        }
      />
    );

  return (
    <section>
      <h1>Audit trail</h1>
      <DataTable
        caption="Recent audit entries"
        emptyMessage="No audit entries yet"
        rows={audit.data?.items ?? []}
        columns={[
          { key: 'time', header: 'When', render: (row) => row.timestamp },
          { key: 'action', header: 'Action', render: (row) => row.action },
          {
            key: 'actor',
            header: 'Actor role',
            render: (row) => row.actorRole,
          },
          { key: 'entity', header: 'Employee', render: (row) => row.entityId },
          {
            key: 'reason',
            header: 'Reason',
            render: (row) => row.reason ?? '—',
          },
        ]}
      />
    </section>
  );
}
