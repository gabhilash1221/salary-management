import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../components/ThemeToggle';
import { AuthProvider } from '../features/auth/auth-context';
import { ThemeProvider } from './theme-context';

describe('ThemeProvider', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('stores night mode and marks the document', () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Night' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('salary-theme')).toBe('night');
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
