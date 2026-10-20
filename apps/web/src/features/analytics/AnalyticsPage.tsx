import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '../../api/client';
import type { SummaryRow } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';
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
    <section>
      <h1>Compensation analytics</h1>
      <label htmlFor="groupBy">
        Group by
        <select
          id="groupBy"
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value)}
        >
          <option value="department">Department</option>
          <option value="country">Country</option>
          <option value="employmentStatus">Employment status</option>
        </select>
      </label>
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
      {summary.data ? <p>{summary.data.definition}</p> : null}
      {summary.data && summary.data.results.length === 0 ? (
        <p className="empty">No groups to show</p>
      ) : null}
      {summary.data && summary.data.results.length > 0 ? (
        <table>
          <caption>Salary summary</caption>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Currency</th>
              <th scope="col">Count</th>
              <th scope="col">Median</th>
            </tr>
          </thead>
          <tbody>
            {summary.data.results.map((row) => (
              <tr
                key={`${row.currency}-${row.department ?? ''}-${row.country ?? ''}-${row.employmentStatus ?? ''}`}
              >
                <td>
                  {row.department ??
                    row.country ??
                    row.employmentStatus ??
                    'All'}
                </td>
                <td>{row.currency}</td>
                <td>{row.count}</td>
                <td>
                  {row.suppressed || row.median === undefined
                    ? 'Suppressed'
                    : formatMoney(row.median, row.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
