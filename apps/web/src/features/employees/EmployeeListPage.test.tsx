import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/auth-context';
import { EmployeeListPage } from './EmployeeListPage';

const emptyPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>
          <EmployeeListPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function searchedFor(term: string) {
  return vi
    .mocked(fetch)
    .mock.calls.some(([url]) => String(url).includes(`search=${term}`));
}

describe('EmployeeListPage search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => emptyPage,
      }),
    );
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('searches 300ms after typing stops', async () => {
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'jose' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(searchedFor('jose')).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(searchedFor('jose')).toBe(true);
  });

  it('requests employees when a dropdown changes', async () => {
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.change(screen.getByLabelText('Department'), {
      target: { value: 'Engineering' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) =>
          String(url).includes('department=Engineering'),
        ),
    ).toBe(true);
    expect(
      screen.queryByRole('button', { name: 'Bulk Import Employees' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add employee' })).toBeNull();
  });

  it('offers bulk import to an HR manager', async () => {
    sessionStorage.setItem(
      'salary-auth',
      JSON.stringify({
        token: 'token',
        role: 'HR_MANAGER',
        email: 'hr.manager@acme.test',
      }),
    );
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(
      screen.getByRole('button', { name: 'Bulk Import Employees' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add employee' })).toBeTruthy();
  });

  it('sorts a column and toggles the direction', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => pageOf([sampleEmployee]),
      }),
    );
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Department' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(lastEmployeeUrl()).toContain('sort=department');
    expect(lastEmployeeUrl()).toContain('order=asc');

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Department' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(lastEmployeeUrl()).toContain('sort=department');
    expect(lastEmployeeUrl()).toContain('order=desc');
  });

  it('adds an employee from the dialog', async () => {
    signInManager();
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Ada' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Lovelace' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Job title'), {
      target: { value: 'Engineer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save employee' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const saved = requestWith('POST');
    expect(saved.url).toBe('/api/v1/employees');
    expect(JSON.parse(saved.body)).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
      jobTitle: 'Engineer',
      terminationDate: null,
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('edits and deletes a row from the actions menu', async () => {
    signInManager();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => pageOf([sampleEmployee]),
      }),
    );
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for EMP-000009' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(screen.getByRole('dialog', { name: 'Edit employee' })).toBeTruthy();
    expect(screen.getByLabelText('First name')).toHaveValue('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for EMP-000009' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(
      screen.getByRole('dialog', { name: 'Delete employee' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete employee' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const removed = requestWith('DELETE');
    expect(removed.url).toBe('/api/v1/employees/EMP-000009');
    expect(JSON.parse(removed.body)).toEqual({
      version: 1,
    });
  });
});

const sampleEmployee = {
  id: 'emp_1',
  employeeId: 'EMP-000009',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  department: 'Engineering',
  country: 'GB',
  jobTitle: 'Engineer',
  status: 'Active',
  hireDate: '2024-01-15',
  terminationDate: null,
  version: 1,
  currentSalary: null,
};

function pageOf(items: unknown[]) {
  return { items, total: items.length, page: 1, pageSize: 25 };
}

function signInManager() {
  sessionStorage.setItem(
    'salary-auth',
    JSON.stringify({
      token: 'token',
      role: 'HR_MANAGER',
      email: 'hr.manager@acme.test',
    }),
  );
}

function requestWith(method: string): { url: string; body: string } {
  const match = vi
    .mocked(fetch)
    .mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === method,
    );
  if (!match) throw new Error(`No ${method} request`);
  const init = match[1] as RequestInit;
  return { url: String(match[0]), body: String(init.body) };
}

function lastEmployeeUrl(): string {
  const urls = vi
    .mocked(fetch)
    .mock.calls.map(([url]) => String(url))
    .filter((url) => url.includes('/api/v1/employees?'));
  return urls.at(-1) ?? '';
}
