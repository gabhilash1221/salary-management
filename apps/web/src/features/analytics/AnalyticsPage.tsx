import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '../../api/client';
import type { SummaryRow } from '../../api/types';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { LoadingState } from '../../components/LoadingState';
import { formatMoney } from '../../lib/formatMoney';
import { useAuth } from '../auth/auth-context';

export function AnalyticsPage() {
  const { session } = useAuth();
  const [groupBy, setGroupBy] = useState('department');
  const summary = useQuery({
    queryKey: ['analytics', groupBy],
    queryFn: () =>
      apiFetch<{ definition: string; results: SummaryRow[] }>(
        `/api/v1/analytics/summary?groupBy=${groupBy}`,
        {},
        session?.token,
      ),
  });

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl">Compensation analytics</h1>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <Field label="Group by" htmlFor="groupBy">
          <select
            id="groupBy"
            className={controlClass}
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
          >
            <option value="department">Department</option>
            <option value="country">Country</option>
            <option value="employmentStatus">Employment status</option>
          </select>
        </Field>
        {summary.isLoading ? <LoadingState /> : null}
        {summary.isError ? (
          <ErrorState
            message={
              summary.error instanceof Error
                ? summary.error.message
                : 'Could not load analytics'
            }
          />
        ) : null}
        {summary.data ? (
          <p className="text-sm text-muted">{summary.data.definition}</p>
        ) : null}
      </div>
      {summary.data && summary.data.results.length === 0 ? (
        <EmptyState message="No groups to show" />
      ) : null}
      {summary.data && summary.data.results.length > 0 ? (
        <DataTable
          caption="Salary summary"
          emptyMessage="No groups to show"
          rows={summary.data.results}
          rowKey={(row) =>
            `${row.currency}-${row.department ?? ''}-${row.country ?? ''}-${row.employmentStatus ?? ''}`
          }
          columns={[
            {
              key: 'group',
              header: 'Group',
              render: (row) =>
                row.department ?? row.country ?? row.employmentStatus ?? 'All',
            },
            {
              key: 'currency',
              header: 'Currency',
              render: (row) => row.currency,
            },
            { key: 'count', header: 'Count', render: (row) => row.count },
            {
              key: 'median',
              header: 'Median',
              render: (row) =>
                row.suppressed || row.median === undefined
                  ? 'Suppressed'
                  : formatMoney(row.median, row.currency),
            },
          ]}
        />
      ) : null}
    </section>
  );
}
