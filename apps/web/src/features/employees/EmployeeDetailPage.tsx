import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { Employee, Salary } from '../../api/types';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { formatMoney } from '../../lib/formatMoney';
import { useAuth } from '../auth/auth-context';
import { SalaryForm } from '../salary/SalaryForm';

const HISTORY_ROLES = new Set(['HR_MANAGER', 'HR_VIEWER', 'AUDITOR']);

export function EmployeeDetailPage() {
  const { employeeId = '' } = useParams();
  const { session } = useAuth();
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
            : 'Employee not found'
        }
      />
    );
  }

  const current = employee.data.currentSalary;

  return (
    <section className="grid gap-4">
      <p>
        <Link to="/employees">Back to directory</Link>
      </p>
      <h1 className="text-2xl">
        {employee.data.firstName} {employee.data.lastName}
      </h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-muted">ID</dt>
          <dd>{employee.data.employeeId}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Department</dt>
          <dd>{employee.data.department}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Country</dt>
          <dd>{employee.data.country}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Status</dt>
          <dd>{employee.data.status}</dd>
        </div>
        {current ? (
          <div className="col-span-2">
            <dt className="text-sm text-muted">Current salary</dt>
            <dd>
              {formatMoney(current.amountMinor, current.currency)} from{' '}
              {current.effectiveDate}
            </dd>
          </div>
        ) : null}
      </dl>
      {canUpdate ? (
        <Card>
          <h2 className="mb-3 text-lg">Update salary</h2>
          <SalaryForm
            pending={update.isPending}
            error={
              update.isError && update.error instanceof Error
                ? update.error.message
                : null
            }
            onSubmit={(input) => update.mutate(input)}
          />
        </Card>
      ) : null}
      {canReadHistory ? (
        <DataTable
          caption="Salary history"
          emptyMessage="No salary history"
          rows={(history.data?.records ?? []).map((record) => ({ ...record }))}
          columns={[
            {
              key: 'date',
              header: 'Effective date',
              render: (row) => row.effectiveDate,
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (row) => formatMoney(row.amountMinor, row.currency),
            },
            {
              key: 'reason',
              header: 'Reason',
              render: (row) => row.reason ?? '—',
            },
          ]}
        />
      ) : null}
      {history.isError ? (
        <ErrorState message="Could not load salary history" />
      ) : null}
    </section>
  );
}
