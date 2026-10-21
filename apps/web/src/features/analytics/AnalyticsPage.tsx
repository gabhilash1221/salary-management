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
import { groupLabel as localizeGroup } from '../../i18n/catalog';
import { useI18n } from '../../i18n/locale-context';
import { formatMoney } from '../../lib/formatMoney';
import { useAuth } from '../auth/auth-context';
import { AnalyticsSkeleton, DistributionSkeleton } from './AnalyticsSkeleton';
import {
  currenciesIn,
  distributionItems,
  headcountItems,
  medianItems,
} from './chart-data';

function compactMoney(
  amountMinor: number,
  currency: string,
  locale: 'en' | 'pt',
): string {
  return new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function AnalyticsPage() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
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
    (amount, currency) => compactMoney(amount, currency, locale),
  );
  const headcount = rows.reduce((total, row) => total + row.count, 0);
  const present = (items: typeof buckets) =>
    items.map((item) => ({
      ...item,
      label: localizeGroup(locale, item.label),
      display:
        item.display === 'Suppressed'
          ? t('analytics.suppressed')
          : item.display,
    }));

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl">{t('analytics.title')}</h1>
          {summary.isLoading ? (
            <Skeleton className="mt-2 h-4 w-40" />
          ) : rows.length > 0 ? (
            <p className="mt-1 text-sm text-muted">
              {t('analytics.people', {
                count: headcount.toLocaleString(
                  locale === 'pt' ? 'pt-PT' : 'en',
                ),
                currency: activeCurrency,
              })}
            </p>
          ) : null}
        </div>
        <Field label={t('analytics.groupBy')} htmlFor="groupBy">
          <select
            id="groupBy"
            className={`${controlClass} sm:w-56`}
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
          >
            <option value="department">{t('employees.department')}</option>
            <option value="country">{t('employees.country')}</option>
            <option value="employmentStatus">
              {t('analytics.employmentStatus')}
            </option>
          </select>
        </Field>
      </div>
      {summary.isLoading ? <AnalyticsSkeleton /> : null}
      {summary.isError ? (
        <ErrorState
          message={
            summary.error instanceof Error
              ? summary.error.message
              : t('analytics.loadError')
          }
        />
      ) : null}
      {summary.data ? (
        <p className="text-sm text-muted">{summary.data.definition}</p>
      ) : null}
      {currencies.length > 1 ? (
        <fieldset className="flex flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">{t('salary.currency')}</legend>
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
        <EmptyState message={t('analytics.empty')} />
      ) : null}
      {rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg">{t('analytics.median')}</h2>
            <BarChart
              items={present(
                medianItems(rows, (amount, currency) =>
                  formatMoney(amount, currency, locale),
                ),
              )}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg">{t('analytics.headcount')}</h2>
            <BarChart items={present(headcountItems(rows))} />
          </Card>
        </div>
      ) : null}
      {summary.isLoading ? null : (
        <Card>
          <h2 className="mb-1 text-lg">{t('analytics.distribution')}</h2>
          <p className="mb-4 text-sm text-muted">
            {t('analytics.distributionHelp', {
              amount: compactMoney(5_000_000, activeCurrency || 'USD', locale),
            })}
          </p>
          {distribution.isLoading ? <DistributionSkeleton /> : null}
          {distribution.isError ? (
            <ErrorState message={t('analytics.distributionError')} />
          ) : null}
          {distribution.data && buckets.length === 0 ? (
            <EmptyState message={t('analytics.distributionEmpty')} />
          ) : null}
          {buckets.length > 0 ? <ColumnChart items={buckets} /> : null}
        </Card>
      )}
      {rows.length > 0 ? (
        <DataTable
          caption={t('analytics.caption')}
          emptyMessage={t('analytics.empty')}
          rows={rows}
          rowKey={(row) =>
            `${row.currency}-${row.department ?? ''}-${row.country ?? ''}-${row.employmentStatus ?? ''}`
          }
          columns={[
            {
              key: 'group',
              header: t('analytics.group'),
              render: (row) =>
                localizeGroup(
                  locale,
                  row.department ??
                    row.country ??
                    row.employmentStatus ??
                    'All',
                ),
            },
            {
              key: 'currency',
              header: t('salary.currency'),
              render: (row) => row.currency,
            },
            {
              key: 'count',
              header: t('analytics.count'),
              render: (row) => row.count,
            },
            {
              key: 'median',
              header: t('analytics.median'),
              render: (row) =>
                row.suppressed || row.median === undefined
                  ? t('analytics.suppressed')
                  : formatMoney(row.median, row.currency, locale),
            },
            {
              key: 'average',
              header: t('analytics.average'),
              render: (row) =>
                row.suppressed || row.average === undefined
                  ? t('analytics.suppressed')
                  : formatMoney(row.average, row.currency, locale),
            },
          ]}
        />
      ) : null}
    </section>
  );
}
