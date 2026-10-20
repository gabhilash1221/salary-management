import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from './auth-context';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('labels the email and password fields', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
