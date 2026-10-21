import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { Employee, EmployeePage } from '../../api/types';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { LoadingState } from '../../components/LoadingState';
import { Pagination } from '../../components/Pagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePaginationState } from '../../hooks/usePaginationState';
import {
  COUNTRIES,
  DEPARTMENTS,
  formatMoney,
  STATUSES,
} from '../../lib/formatMoney';
import { useAuth } from '../auth/auth-context';
import { EmployeeImport } from './EmployeeImport';

const SEARCH_DEBOUNCE_MS = 300;

export function EmployeeListPage() {
  const { session } = useAuth();
  const { page, pageSize, setPage, setPageSize } = usePaginationState();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [department, setDepartment] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const filterKey = `${debouncedSearch}\0${department}\0${country}\0${status}`;
  const appliedFilterKey = useRef(filterKey);
  if (appliedFilterKey.current !== filterKey) {
    appliedFilterKey.current = filterKey;
    setPage(1);
  }

  const query = useQuery({
    queryKey: [
      'employees',
      page,
      pageSize,
      debouncedSearch,
      department,
      country,
      status,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
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
      <h1 className="mb-4 text-2xl">Employees</h1>
      {session?.role === 'HR_MANAGER' ? (
        <EmployeeImport token={session.token} />
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search" htmlFor="search">
          <input
            id="search"
            className={controlClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label="Department" htmlFor="department">
          <select
            id="department"
            className={controlClass}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="">Any</option>
            {DEPARTMENTS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Country" htmlFor="country">
          <select
            id="country"
            className={controlClass}
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">Any</option>
            {COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="status">
          <select
            id="status"
            className={controlClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Any</option>
            {STATUSES.map((item) => (
              <option key={item}>{item}</option>
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
              : 'Could not load employees'
          }
        />
      ) : null}
      {query.data && query.data.items.length === 0 ? (
        <EmptyState message="No employees found" />
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
            caption="Employee directory"
            emptyMessage="No employees found"
            rows={query.data.items}
            columns={directoryColumns(
              query.data.items.some((employee) => 'currentSalary' in employee),
            )}
          />
        </>
      ) : null}
    </section>
  );
}

function directoryColumns(showSalary: boolean) {
  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (employee: Employee) => (
        <Link to={`/employees/${employee.employeeId}`}>
          {employee.employeeId}
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (employee: Employee) =>
        `${employee.firstName} ${employee.lastName}`,
    },
    {
      key: 'department',
      header: 'Department',
      render: (employee: Employee) => employee.department,
    },
    {
      key: 'country',
      header: 'Country',
      render: (employee: Employee) => employee.country,
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee: Employee) => employee.status,
    },
  ];
  if (!showSalary) return columns;
  return [
    ...columns,
    {
      key: 'salary',
      header: 'Current salary',
      render: (employee: Employee) =>
        employee.currentSalary
          ? formatMoney(
              employee.currentSalary.amountMinor,
              employee.currentSalary.currency,
            )
          : '—',
    },
  ];
}
