import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouter } from '../../app/router';
import { AuthProvider, useAuth } from './auth-context';
import { TOKEN_EXPIRED_MESSAGE } from './token';

const STORAGE_KEY = 'salary-auth';

function jwt(expSeconds: number) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  return `${encode({ alg: 'HS256' })}.${encode({ exp: expSeconds })}.sig`;
}

function renderWithAuth(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/employees']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function SessionStatus() {
  const { session } = useAuth();
  return <p>{session ? session.email : 'signed out'}</p>;
}

describe('expired session', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('sends the user to sign in and shows a toast when the stored token is expired', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: jwt(Math.floor(Date.now() / 1000) - 10),
        role: 'HR_MANAGER',
        email: 'hr.manager@acme.test',
      }),
    );

    renderWithAuth(
      <AuthProvider>
        <AppRouter />
      </AuthProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(TOKEN_EXPIRED_MESSAGE);
    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('signs the user out when the token reaches its expiry', async () => {
    vi.useFakeTimers();
    const exp = Math.floor(Date.now() / 1000) + 1;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: jwt(exp),
        role: 'HR_MANAGER',
        email: 'hr.manager@acme.test',
      }),
    );

    renderWithAuth(
      <AuthProvider>
        <SessionStatus />
      </AuthProvider>,
    );
    expect(screen.getByText('hr.manager@acme.test')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText('signed out')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(TOKEN_EXPIRED_MESSAGE);
  });
});
