import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { Employee, Salary } from '../../api/types';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { countryLabel, departmentLabel, statusLabel } from '../../i18n/catalog';
import { useI18n } from '../../i18n/locale-context';
import { formatMoney } from '../../lib/formatMoney';
import { earliestSalaryDate } from '../../lib/nextIsoDate';
import { useAuth } from '../auth/auth-context';
import { SalaryForm } from '../salary/SalaryForm';

const HISTORY_ROLES = new Set(['HR_MANAGER', 'HR_VIEWER', 'AUDITOR']);

export function EmployeeDetailPage() {
  const { employeeId = '' } = useParams();
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const canReadHistory = HISTORY_ROLES.has(session?.role ?? '');
  const canUpdate = session?.role === 'HR_MANAGER';

  const employee = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () =>
      apiFetch<Employee>(`/api/v1/employees/${employeeId}`, {}, session?.token),
  });
  const history = useQuery({
    queryKey: ['history', employeeId],
    enabled: canReadHistory,
    queryFn: () =>
      apiFetch<{ records: Salary[] }>(
        `/api/v1/employees/${employeeId}/salary/history`,
        {},
        session?.token,
      ),
  });
  const update = useMutation({
    mutationFn: (input: {
      amountMinor: number;
      currency: string;
      effectiveDate: string;
      reason: string;
    }) =>
      apiFetch(
        `/api/v1/employees/${employeeId}/salary`,
        {
          method: 'PUT',
          body: JSON.stringify({
            ...input,
            version: employee.data?.version,
            reason: input.reason || undefined,
          }),
        },
        session?.token,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['employee', employeeId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['history', employeeId],
      });
    },
  });

  if (employee.isLoading) return <LoadingState />;
  if (employee.isError || !employee.data) {
    return (
      <ErrorState
        message={
          employee.error instanceof Error
            ? employee.error.message
            : t('detail.notFound')
        }
      />
    );
  }

  const current = employee.data.currentSalary;

  return (
    <section className="grid gap-4">
      <p>
        <Link to="/employees">{t('detail.back')}</Link>
      </p>
      <h1 className="text-2xl">
        {employee.data.firstName} {employee.data.lastName}
      </h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-muted">{t('employees.id')}</dt>
          <dd>{employee.data.employeeId}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t('employees.department')}</dt>
          <dd>{departmentLabel(locale, employee.data.department)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t('employees.country')}</dt>
          <dd>{countryLabel(locale, employee.data.country)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t('employees.status')}</dt>
          <dd>{statusLabel(locale, employee.data.status)}</dd>
        </div>
        {current ? (
          <div className="col-span-2">
            <dt className="text-sm text-muted">
              {t('employees.currentSalary')}
            </dt>
            <dd>
              {t('detail.salaryFrom', {
                amount: formatMoney(
                  current.amountMinor,
                  current.currency,
                  locale,
                ),
                date: current.effectiveDate,
              })}
            </dd>
          </div>
        ) : null}
      </dl>
      {canUpdate ? (
        <Card>
          <h2 className="mb-3 text-lg">{t('salary.update')}</h2>
          {update.isSuccess ? (
            <p className="mb-3 text-sm text-brand" role="status">
              {t('detail.updated', {
                date: update.variables?.effectiveDate ?? '',
              })}
            </p>
          ) : null}
          {history.isLoading ? (
            <LoadingState message={t('detail.historyLoading')} />
          ) : (
            <SalaryForm
              key={`${current?.currency ?? 'USD'}-${earliestSalaryDate(
                employee.data.hireDate,
                history.data?.records[0]?.effectiveDate ?? null,
              )}`}
              pending={update.isPending}
              error={
                update.isError && update.error instanceof Error
                  ? update.error.message
                  : null
              }
              defaultCurrency={current?.currency ?? 'USD'}
              latestSalaryDate={history.data?.records[0]?.effectiveDate ?? null}
              earliestDate={earliestSalaryDate(
                employee.data.hireDate,
                history.data?.records[0]?.effectiveDate ?? null,
              )}
              onSubmit={(input) => update.mutate(input)}
            />
          )}
        </Card>
      ) : null}
      {canReadHistory ? (
        <DataTable
          caption={t('detail.historyCaption')}
          emptyMessage={t('detail.historyEmpty')}
          rows={(history.data?.records ?? []).map((record) => ({ ...record }))}
          columns={[
            {
              key: 'date',
              header: t('detail.effectiveDate'),
              render: (row) => row.effectiveDate,
            },
            {
              key: 'amount',
              header: t('detail.amount'),
              render: (row) =>
                formatMoney(row.amountMinor, row.currency, locale),
            },
            {
              key: 'reason',
              header: t('salary.reason'),
              render: (row) => row.reason ?? '—',
            },
          ]}
        />
      ) : null}
      {history.isError ? (
        <ErrorState message={t('detail.historyError')} />
      ) : null}
    </section>
  );
}
