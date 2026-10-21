import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { Employee } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { countryLabel, departmentLabel, statusLabel } from '../../i18n/catalog';
import { useI18n } from '../../i18n/locale-context';
import { COUNTRIES, DEPARTMENTS, STATUSES } from '../../lib/formatMoney';

type Draft = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  country: string;
  jobTitle: string;
  status: string;
  hireDate: string;
  terminationDate: string;
};

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function draftFrom(employee: Employee | null): Draft {
  return {
    employeeId: employee?.employeeId ?? '',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    email: employee?.email ?? '',
    department: employee?.department ?? 'Engineering',
    country: employee?.country ?? 'IN',
    jobTitle: employee?.jobTitle ?? '',
    status: employee?.status ?? 'Active',
    hireDate: employee?.hireDate ?? todayIso(),
    terminationDate: employee?.terminationDate ?? '',
  };
}

export function EmployeeFormDialog({
  token,
  employee,
  onClose,
}: {
  token: string;
  employee: Employee | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(employee));
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<Employee>(
        employee
          ? `/api/v1/employees/${employee.employeeId}`
          : '/api/v1/employees',
        {
          method: employee ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        },
        token,
      ),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({
        queryKey: ['employee', saved.employeeId],
      });
      onClose();
    },
  });

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function update(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const title = employee ? t('employees.editTitle') : t('employees.addTitle');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-surface p-4 text-ink shadow-lg"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="employee-form-title" className="text-xl">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('common.close')}
            className="cursor-pointer rounded-md px-2 py-1 text-2xl leading-none text-ink"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const body: Record<string, unknown> = {
              firstName: draft.firstName.trim(),
              lastName: draft.lastName.trim(),
              email: draft.email.trim(),
              department: draft.department,
              country: draft.country,
              jobTitle: draft.jobTitle.trim(),
              status: draft.status,
              hireDate: draft.hireDate,
              terminationDate:
                draft.status === 'Terminated' ? draft.terminationDate : null,
            };
            if (!employee && draft.employeeId.trim() !== '') {
              body.employeeId = draft.employeeId.trim();
            }
            if (employee) body.version = employee.version;
            save.mutate(body);
          }}
        >
          <Field label={t('employees.firstName')} htmlFor="employee-first-name">
            <input
              id="employee-first-name"
              className={controlClass}
              value={draft.firstName}
              required
              onChange={(event) => update('firstName', event.target.value)}
            />
          </Field>
          <Field label={t('employees.lastName')} htmlFor="employee-last-name">
            <input
              id="employee-last-name"
              className={controlClass}
              value={draft.lastName}
              required
              onChange={(event) => update('lastName', event.target.value)}
            />
          </Field>
          <Field label={t('common.email')} htmlFor="employee-email">
            <input
              id="employee-email"
              type="email"
              className={controlClass}
              value={draft.email}
              required
              onChange={(event) => update('email', event.target.value)}
            />
          </Field>
          <Field label={t('employees.id')} htmlFor="employee-id">
            <input
              id="employee-id"
              className={controlClass}
              value={draft.employeeId}
              placeholder={employee ? undefined : t('employees.idPlaceholder')}
              disabled={employee !== null}
              onChange={(event) => update('employeeId', event.target.value)}
            />
          </Field>
          <Field
            label={t('employees.department')}
            htmlFor="employee-department"
          >
            <select
              id="employee-department"
              className={controlClass}
              value={draft.department}
              onChange={(event) => update('department', event.target.value)}
            >
              {DEPARTMENTS.map((item) => (
                <option key={item} value={item}>
                  {departmentLabel(locale, item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('employees.country')} htmlFor="employee-country">
            <select
              id="employee-country"
              className={controlClass}
              value={draft.country}
              onChange={(event) => update('country', event.target.value)}
            >
              {COUNTRIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {countryLabel(locale, item.code)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('employees.jobTitle')} htmlFor="employee-job-title">
            <input
              id="employee-job-title"
              className={controlClass}
              value={draft.jobTitle}
              required
              onChange={(event) => update('jobTitle', event.target.value)}
            />
          </Field>
          <Field label={t('employees.status')} htmlFor="employee-status">
            <select
              id="employee-status"
              className={controlClass}
              value={draft.status}
              onChange={(event) => update('status', event.target.value)}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {statusLabel(locale, item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('employees.hireDate')} htmlFor="employee-hire-date">
            <input
              id="employee-hire-date"
              type="date"
              className={controlClass}
              value={draft.hireDate}
              required
              onChange={(event) => update('hireDate', event.target.value)}
            />
          </Field>
          {draft.status === 'Terminated' ? (
            <Field
              label={t('employees.terminationDate')}
              htmlFor="employee-termination-date"
            >
              <input
                id="employee-termination-date"
                type="date"
                className={controlClass}
                value={draft.terminationDate}
                required
                onChange={(event) =>
                  update('terminationDate', event.target.value)
                }
              />
            </Field>
          ) : null}
          {employee ? (
            <p className="text-sm text-muted sm:col-span-2">
              {t('employees.salaryHint')}{' '}
              <Link to={`/employees/${employee.employeeId}`}>
                {t('employees.record')}
              </Link>
              .
            </p>
          ) : null}
          {save.isError ? (
            <div className="sm:col-span-2">
              <ErrorState
                message={
                  save.error instanceof Error
                    ? save.error.message
                    : t('employees.saveError')
                }
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {t('employees.save')}
            </Button>
            <button
              type="button"
              className="cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-ink"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteEmployeeDialog({
  token,
  employee,
  onClose,
}: {
  token: string;
  employee: Employee;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const remove = useMutation({
    mutationFn: () =>
      apiFetch<{ employeeId: string }>(
        `/api/v1/employees/${employee.employeeId}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ version: employee.version }),
        },
        token,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({
        queryKey: ['employee', employee.employeeId],
      });
      onClose();
    },
  });

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-employee-title"
        className="w-full max-w-md rounded-lg border border-line bg-surface p-4 text-ink shadow-lg"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="delete-employee-title" className="text-xl">
            {t('employees.deleteTitle')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('common.close')}
            className="cursor-pointer rounded-md px-2 py-1 text-2xl leading-none text-ink"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p>
          {t('employees.deleteBody', {
            id: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
          })}
        </p>
        {remove.isError ? (
          <div className="mt-3">
            <ErrorState
              message={
                remove.error instanceof Error
                  ? remove.error.message
                  : t('employees.deleteError')
              }
            />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-danger px-3 py-2 text-danger disabled:opacity-50"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {t('employees.deleteConfirm')}
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-ink"
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
