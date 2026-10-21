import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/auth-context';
import { AnalyticsPage } from './AnalyticsPage';

const summary = {
  definition: 'Current salary by department.',
  results: [
    {
      department: 'Engineering',
      currency: 'INR',
      count: 4,
      median: 100000,
      average: 120000,
      suppressed: false,
    },
  ],
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <AnalyticsPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AnalyticsPage loading', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a skeleton while analytics is loading', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading analytics');
    expect(
      screen.getByRole('heading', { name: 'Compensation analytics' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Salary distribution' }),
    ).not.toBeInTheDocument();
  });

  it('replaces the skeleton when the summary arrives', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () =>
          String(url).includes('distribution')
            ? { definition: 'Buckets', results: [] }
            : summary,
      })),
    );
    renderPage();
    expect(
      await screen.findByText('Current salary by department.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Median salary' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Salary distribution' }),
      ).toBeInTheDocument();
    });
  });
});
