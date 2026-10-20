import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import type { Employee, EmployeePage } from '../../api/types';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
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
      <h1>Employees</h1>
      <div className="filters">
        <label htmlFor="search">
          Search
          <input
            id="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label htmlFor="department">
          Department
          <select
            id="department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="">Any</option>
            {DEPARTMENTS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label htmlFor="country">
          Country
          <select
            id="country"
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
        </label>
        <label htmlFor="status">
          Status
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Any</option>
            {STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
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
          <table>
            <caption>Employee directory</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Department</th>
                <th scope="col">Country</th>
                <th scope="col">Status</th>
                {query.data.items.some(
                  (employee) => 'currentSalary' in employee,
                ) ? (
                  <th scope="col">Current salary</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <Link to={`/employees/${employee.employeeId}`}>
                      {employee.employeeId}
                    </Link>
                  </td>
                  <td>
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td>{employee.department}</td>
                  <td>{employee.country}</td>
                  <td>{employee.status}</td>
                  {'currentSalary' in employee ? (
                    <td>{salaryLabel(employee)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}

function salaryLabel(employee: Employee) {
  if (!employee.currentSalary) return '—';
  return formatMoney(
    employee.currentSalary.amountMinor,
    employee.currentSalary.currency,
  );
}
