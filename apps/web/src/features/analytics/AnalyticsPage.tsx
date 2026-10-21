import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '../../api/client';
import type { DistributionRow, SummaryRow } from '../../api/types';
import { BarChart, ColumnChart } from '../../components/BarChart';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { Skeleton } from '../../components/Skeleton';
import { formatMoney } from '../../lib/formatMoney';
import { useAuth } from '../auth/auth-context';
import { AnalyticsSkeleton, DistributionSkeleton } from './AnalyticsSkeleton';
import {
  currenciesIn,
  distributionItems,
  headcountItems,
  medianItems,
} from './chart-data';

function compactMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function AnalyticsPage() {
  const { session } = useAuth();
  const [groupBy, setGroupBy] = useState('department');
  const [currency, setCurrency] = useState('');
  const summary = useQuery({
    queryKey: ['analytics', groupBy],
    queryFn: () =>
      apiFetch<{ definition: string; results: SummaryRow[] }>(
        `/api/v1/analytics/summary?groupBy=${groupBy}`,
        {},
        session?.token,
      ),
  });
  const distribution = useQuery({
    queryKey: ['analytics-distribution'],
    queryFn: () =>
      apiFetch<{ definition: string; results: DistributionRow[] }>(
        '/api/v1/analytics/distribution',
        {},
        session?.token,
      ),
  });

  const currencies = currenciesIn(summary.data?.results ?? []);
  const activeCurrency = currencies.includes(currency)
    ? currency
    : (currencies[0] ?? '');
  const rows = (summary.data?.results ?? []).filter(
    (row) => row.currency === activeCurrency,
  );
  const buckets = distributionItems(
    (distribution.data?.results ?? []).filter(
      (row) => row.currency === activeCurrency,
    ),
    compactMoney,
  );
  const headcount = rows.reduce((total, row) => total + row.count, 0);

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl">Compensation analytics</h1>
          {summary.isLoading ? (
            <Skeleton className="mt-2 h-4 w-40" />
          ) : rows.length > 0 ? (
            <p className="mt-1 text-sm text-muted">
              {headcount.toLocaleString('en')} people · {activeCurrency}
            </p>
          ) : null}
        </div>
        <Field label="Group by" htmlFor="groupBy">
          <select
            id="groupBy"
            className={`${controlClass} sm:w-56`}
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
          >
            <option value="department">Department</option>
            <option value="country">Country</option>
            <option value="employmentStatus">Employment status</option>
          </select>
        </Field>
      </div>
      {summary.isLoading ? <AnalyticsSkeleton /> : null}
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
      {currencies.length > 1 ? (
        <fieldset className="flex flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Currency</legend>
          {currencies.map((code) => (
            <button
              key={code}
              type="button"
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${
                code === activeCurrency
                  ? 'bg-brand text-white'
                  : 'border border-line bg-surface text-ink'
              }`}
              aria-pressed={code === activeCurrency}
              onClick={() => setCurrency(code)}
            >
              {code}
            </button>
          ))}
        </fieldset>
      ) : null}
      {summary.data && summary.data.results.length === 0 ? (
        <EmptyState message="No groups to show" />
      ) : null}
      {rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg">Median salary</h2>
            <BarChart items={medianItems(rows, formatMoney)} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg">Headcount</h2>
            <BarChart items={headcountItems(rows)} />
          </Card>
        </div>
      ) : null}
      {summary.isLoading ? null : (
        <Card>
          <h2 className="mb-1 text-lg">Salary distribution</h2>
          <p className="mb-4 text-sm text-muted">
            Each bar is a {compactMoney(5_000_000, activeCurrency || 'USD')}{' '}
            range. Hover a bar for the count.
          </p>
          {distribution.isLoading ? <DistributionSkeleton /> : null}
          {distribution.isError ? (
            <ErrorState message="Could not load the salary distribution" />
          ) : null}
          {distribution.data && buckets.length === 0 ? (
            <EmptyState message="No salary distribution to show" />
          ) : null}
          {buckets.length > 0 ? <ColumnChart items={buckets} /> : null}
        </Card>
      )}
      {rows.length > 0 ? (
        <DataTable
          caption="Salary summary"
          emptyMessage="No groups to show"
          rows={rows}
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
            {
              key: 'average',
              header: 'Average',
              render: (row) =>
                row.suppressed || row.average === undefined
                  ? 'Suppressed'
                  : formatMoney(row.average, row.currency),
            },
          ]}
        />
      ) : null}
    </section>
  );
}
