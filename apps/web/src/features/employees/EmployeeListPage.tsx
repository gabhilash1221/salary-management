import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { Employee, EmployeePage } from '../../api/types';
import { Button } from '../../components/Button';
import { type Column, DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { LoadingState } from '../../components/LoadingState';
import { Pagination } from '../../components/Pagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePaginationState } from '../../hooks/usePaginationState';
import {
  countryLabel,
  departmentLabel,
  type MessageKey,
  statusLabel,
} from '../../i18n/catalog';
import { useI18n } from '../../i18n/locale-context';
import {
  COUNTRIES,
  DEPARTMENTS,
  formatMoney,
  STATUSES,
} from '../../lib/formatMoney';
import { useAuth } from '../auth/auth-context';
import { DeleteEmployeeDialog, EmployeeFormDialog } from './EmployeeDialogs';
import { EmployeeImport } from './EmployeeImport';
import { EmployeeRowMenu } from './EmployeeRowMenu';

const SEARCH_DEBOUNCE_MS = 500;

export function EmployeeListPage() {
  const { session } = useAuth();
  const { locale, t } = useI18n();
  const canManage = session?.role === 'HR_MANAGER';
  const { page, pageSize, setPage, setPageSize } = usePaginationState();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [department, setDepartment] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const filterKey = `${debouncedSearch}\0${department}\0${country}\0${status}`;
  const appliedFilterKey = useRef(filterKey);
  if (appliedFilterKey.current !== filterKey) {
    appliedFilterKey.current = filterKey;
    setPage(1);
  }
  const closeMenu = useCallback(() => setMenuFor(null), []);
  const closeForm = useCallback(() => {
    setCreating(false);
    setEditing(null);
  }, []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const changeSort = useCallback(
    (key: string) => {
      if (key === sort) {
        setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      } else {
        setSort(key);
        setOrder('asc');
      }
      setPage(1);
    },
    [setPage, sort],
  );

  const query = useQuery({
    queryKey: [
      'employees',
      page,
      pageSize,
      debouncedSearch,
      department,
      country,
      status,
      sort,
      order,
    ],
    placeholderData: keepPreviousData,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        order,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (department) params.set('department', department);
      if (country) params.set('country', country);
      if (status) params.set('status', status);
      return apiFetch<EmployeePage>(
        `/api/v1/employees?${params.toString()}`,
        {},
        session?.token,
      );
    },
  });

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl">{t('employees.title')}</h1>
        {canManage && session ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <EmployeeImport token={session.token} />
            <Button onClick={() => setCreating(true)}>
              {t('employees.add')}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t('employees.search')} htmlFor="search">
          <input
            id="search"
            className={controlClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label={t('employees.department')} htmlFor="department">
          <select
            id="department"
            className={controlClass}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="">{t('common.any')}</option>
            {DEPARTMENTS.map((item) => (
              <option key={item} value={item}>
                {departmentLabel(locale, item)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('employees.country')} htmlFor="country">
          <select
            id="country"
            className={controlClass}
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">{t('common.any')}</option>
            {COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>
                {countryLabel(locale, item.code)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('employees.status')} htmlFor="status">
          <select
            id="status"
            className={controlClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">{t('common.any')}</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusLabel(locale, item)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : t('employees.loadError')
          }
        />
      ) : null}
      {query.data && query.data.items.length === 0 ? (
        <EmptyState message={t('employees.empty')} />
      ) : null}
      {query.data && query.data.items.length > 0 ? (
        <>
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          <DataTable
            caption={t('employees.caption')}
            emptyMessage={t('employees.empty')}
            fillRemaining
            rows={query.data.items}
            sort={{ key: sort, order, onChange: changeSort }}
            columns={directoryColumns({
              locale,
              t,
              showSalary: query.data.items.some(
                (employee) => 'currentSalary' in employee,
              ),
              canManage,
              menuFor,
              onOpenMenu: setMenuFor,
              onCloseMenu: closeMenu,
              onEdit: (employee) => {
                closeMenu();
                setEditing(employee);
              },
              onDelete: (employee) => {
                closeMenu();
                setDeleting(employee);
              },
            })}
          />
        </>
      ) : null}
      {canManage && session && (creating || editing) ? (
        <EmployeeFormDialog
          token={session.token}
          employee={editing}
          onClose={closeForm}
        />
      ) : null}
      {canManage && session && deleting ? (
        <DeleteEmployeeDialog
          token={session.token}
          employee={deleting}
          onClose={closeDelete}
        />
      ) : null}
    </section>
  );
}

function directoryColumns({
  locale,
  t,
  showSalary,
  canManage,
  menuFor,
  onOpenMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: {
  locale: 'en' | 'pt';
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  showSalary: boolean;
  canManage: boolean;
  menuFor: string | null;
  onOpenMenu: (employeeId: string) => void;
  onCloseMenu: () => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}): Column<Employee>[] {
  const columns: Column<Employee>[] = [
    {
      key: 'id',
      header: t('employees.id'),
      sortKey: 'employeeId',
      render: (employee) => (
        <Link to={`/employees/${employee.employeeId}`}>
          {employee.employeeId}
        </Link>
      ),
    },
    {
      key: 'name',
      header: t('employees.name'),
      sortKey: 'name',
      render: (employee) => `${employee.firstName} ${employee.lastName}`,
    },
    {
      key: 'department',
      header: t('employees.department'),
      sortKey: 'department',
      render: (employee) => departmentLabel(locale, employee.department),
    },
    {
      key: 'country',
      header: t('employees.country'),
      sortKey: 'country',
      render: (employee) => countryLabel(locale, employee.country),
    },
    {
      key: 'status',
      header: t('employees.status'),
      sortKey: 'status',
      render: (employee) => statusLabel(locale, employee.status),
    },
  ];
  if (showSalary) {
    columns.push({
      key: 'salary',
      header: t('employees.currentSalary'),
      sortKey: 'salary',
      render: (employee) =>
        employee.currentSalary
          ? formatMoney(
              employee.currentSalary.amountMinor,
              employee.currentSalary.currency,
              locale,
            )
          : '—',
    });
  }
  if (canManage) {
    columns.push({
      key: 'actions',
      header: t('employees.actions'),
      render: (employee) => (
        <EmployeeRowMenu
          employee={employee}
          open={menuFor === employee.employeeId}
          onOpen={() => onOpenMenu(employee.employeeId)}
          onClose={onCloseMenu}
          onEdit={() => onEdit(employee)}
          onDelete={() => onDelete(employee)}
        />
      ),
    });
  }
  return columns;
}
