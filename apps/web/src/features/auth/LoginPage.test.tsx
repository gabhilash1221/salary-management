import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../app/theme-context';
import { AuthProvider } from './auth-context';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('labels the email and password fields', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
