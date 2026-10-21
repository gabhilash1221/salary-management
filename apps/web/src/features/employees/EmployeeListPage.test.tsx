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
  });
});
