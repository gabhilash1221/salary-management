import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImportReport } from '../../api/types';
import { EmployeeImport } from './EmployeeImport';

const failedPreview: ImportReport = {
  total: 1,
  valid: 0,
  failed: 1,
  skipped: 0,
  imported: 0,
  rows: [
    {
      row: 2,
      status: 'failed',
      employeeId: 'EMP-900010',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'not-an-email',
      department: 'Engineering',
      messages: ['Email must be a valid address'],
    },
  ],
};

const mixedPreview: ImportReport = {
  total: 2,
  valid: 1,
  failed: 1,
  skipped: 0,
  imported: 0,
  rows: [
    {
      ...failedPreview.rows[0],
      row: 2,
    },
    {
      row: 3,
      status: 'ready',
      employeeId: 'EMP-900011',
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace.import@example.test',
      department: 'People',
      messages: [],
    },
  ],
};

const imported: ImportReport = {
  ...mixedPreview,
  imported: 1,
  rows: mixedPreview.rows.map((row) =>
    row.status === 'ready' ? { ...row, status: 'imported' } : row,
  ),
};

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function renderImport() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EmployeeImport token="token" />
    </QueryClientProvider>,
  );
}

describe('EmployeeImport', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('previews invalid rows before anything is imported', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => failedPreview,
        blob: async () => new Blob(['template']),
      }),
    );
    const blobs: Blob[] = [];
    const createObjectURL = (blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return 'blob:report';
    };
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: () => undefined,
    });

    renderImport();
    fireEvent.click(
      screen.getByRole('button', { name: 'Bulk Import Employees' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Download CSV Template (.csv)' }),
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      '/api/v1/employees/import/templates/employees.csv',
    );

    const input = screen.getByLabelText('Employee file');
    fireEvent.change(input, {
      target: {
        files: [new File(['id'], 'people.csv', { type: 'text/csv' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));

    expect(
      await screen.findByText('Email must be a valid address'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Confirm import' }),
    ).toBeDisabled();
    expect(screen.getByText(/1 failed/)).toBeTruthy();
    const failedRow = screen.getByText('failed').closest('tr');
    expect(failedRow?.className).toMatch(/bg-danger/);
    expect(
      screen.queryByRole('button', { name: 'Download feedback (.xlsx)' }),
    ).toBeNull();
  });

  it('confirms a preview and reports how many rows were imported', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mixedPreview,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => imported,
        }),
    );
    renderImport();
    fireEvent.click(
      screen.getByRole('button', { name: 'Bulk Import Employees' }),
    );
    fireEvent.change(screen.getByLabelText('Employee file'), {
      target: {
        files: [
          new File(['id'], 'people.xlsx', { type: 'application/octet-stream' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));
    expect(await screen.findByText(/1 ready to import/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
    expect(
      await screen.findByRole('dialog', { name: 'Import complete' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Out of 2 employees, 1 imported successfully and 1 failed to import.',
      ),
    ).toBeTruthy();

    const blobs: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob | MediaSource) => {
        blobs.push(blob as Blob);
        return 'blob:feedback';
      },
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: () => undefined,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Download feedback (.xlsx)' }),
    );
    const xml = await readBlob(blobs[0]);
    expect(xml).toContain('Feedback');
    expect(xml).toContain('Imported successfully');
    expect(xml).toContain('Email must be a valid address');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Download feedback (.xlsx)' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Confirm import' }),
    ).toBeDisabled();
  });
});
