import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/auth-context';
import { ProfilePage } from './ProfilePage';

function renderProfile() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>
          <ProfilePage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    sessionStorage.setItem(
      'salary-auth',
      JSON.stringify({
        token: 'token',
        role: 'HR_MANAGER',
        email: 'hr.manager@acme.test',
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: 'hr.manager@acme.test',
          role: 'HR_MANAGER',
          displayName: 'HR Manager',
          theme: 'day',
          hasAvatar: false,
        }),
      }),
    );
  });

  it('shows initials from the display name and checks the password confirmation', async () => {
    renderProfile();
    expect(await screen.findByDisplayValue('HR Manager')).toBeTruthy();
    expect(screen.getByText('HM')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'anotherpass' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(
      await screen.findByText('New password and confirmation must match'),
    ).toBeTruthy();
  });
});
