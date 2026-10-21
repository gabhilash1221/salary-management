import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError, apiDownload, apiUpload } from '../../api/client';
import type { ImportReport, ImportRow } from '../../api/types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DataTable } from '../../components/DataTable';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { feedbackWorkbook } from './feedback-workbook';

const MAX_BYTES = 2 * 1024 * 1024;

export function EmployeeImport({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeSummaryRef = useRef<HTMLButtonElement>(null);

  async function downloadTemplate(kind: 'csv' | 'xlsx') {
    setError(null);
    try {
      await apiDownload(
        `/api/v1/employees/import/templates/employees.${kind}`,
        `employee-import-template.${kind}`,
        token,
      );
    } catch (cause) {
      setError(messageOf(cause, 'Could not download the template'));
    }
  }

  async function preview() {
    const selected = selectedFile();
    if (!selected) return;
    setBusy(true);
    setError(null);
    setConfirmed(false);
    try {
      const next = await apiUpload<ImportReport>(
        '/api/v1/employees/import/preview',
        selected,
        token,
      );
      setReport(next);
    } catch (cause) {
      setReport(null);
      setError(messageOf(cause, 'Could not preview the file'));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    const selected = selectedFile();
    if (!selected || !report || report.valid === 0) return;
    setBusy(true);
    setError(null);
    try {
      const next = await apiUpload<ImportReport>(
        '/api/v1/employees/import',
        selected,
        token,
      );
      setReport(next);
      setConfirmed(true);
      setSummaryOpen(true);
      if (next.imported > 0) {
        await queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    } catch (cause) {
      setError(messageOf(cause, 'Could not import the file'));
    } finally {
      setBusy(false);
    }
  }

  function selectedFile(): File | null {
    if (!file) {
      setError('Choose a .csv or .xlsx file');
      return null;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setError('Upload a .csv or .xlsx file');
      return null;
    }
    if (file.size > MAX_BYTES) {
      setError('File exceeds the 2 MB limit');
      return null;
    }
    return file;
  }

  useEffect(() => {
    if (!summaryOpen) return;
    closeSummaryRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setSummaryOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [summaryOpen]);

  const notImported = report ? report.total - report.imported : 0;

  return (
    <div className="mb-4">
      <Button onClick={() => setOpen((current) => !current)}>
        {open ? 'Close bulk import' : 'Bulk Import Employees'}
      </Button>
      {open ? (
        <Card className="mt-3 grid gap-3">
          <p>
            Download a template, fill in one employee per row, then preview the
            file before importing. Employee ID can be left blank. Salary columns
            are optional. Up to 2,000 rows and 2 MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void downloadTemplate('xlsx')}>
              Download Excel Template (.xlsx)
            </Button>
            <Button onClick={() => void downloadTemplate('csv')}>
              Download CSV Template (.csv)
            </Button>
          </div>
          <Field label="Employee file" htmlFor="employee-import-file">
            <input
              id="employee-import-file"
              className={controlClass}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setReport(null);
                setConfirmed(false);
                setSummaryOpen(false);
                setError(null);
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void preview()}>
              Preview import
            </Button>
            {report ? (
              <Button
                disabled={busy || confirmed || report.valid === 0}
                onClick={() => void confirm()}
              >
                Confirm import
              </Button>
            ) : null}
            {confirmed && report && !summaryOpen ? (
              <Button onClick={() => downloadFeedback(report)}>
                Download feedback (.xlsx)
              </Button>
            ) : null}
          </div>
          {error ? <ErrorState message={error} /> : null}
          {report && !confirmed ? (
            <p role="status">
              {`Preview: ${report.total} records. ${report.valid} ready to import, ${report.failed} failed, ${report.skipped} skipped.`}
            </p>
          ) : null}
          {summaryOpen && report ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-result-title"
                className="w-full max-w-md rounded-lg border border-line bg-surface p-4 text-ink shadow-lg"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 id="import-result-title" className="text-xl">
                    Import complete
                  </h2>
                  <button
                    ref={closeSummaryRef}
                    type="button"
                    aria-label="Close"
                    className="cursor-pointer rounded-md px-2 py-1 text-2xl leading-none text-ink"
                    onClick={() => setSummaryOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <p>
                  Out of {report.total} employees, {report.imported} imported
                  successfully and {notImported} failed to import.
                </p>
                <div className="mt-4">
                  <Button onClick={() => downloadFeedback(report)}>
                    Download feedback (.xlsx)
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {report ? (
            <div className="max-h-96 overflow-auto">
              <DataTable
                caption="Import preview"
                emptyMessage="No rows to preview"
                rows={report.rows}
                rowKey={(row) => String(row.row)}
                rowClassName={rowTone}
                columns={[
                  {
                    key: 'row',
                    header: 'Row',
                    render: (row) => row.row,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => row.status,
                  },
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) =>
                      `${row.employeeId} ${row.firstName} ${row.lastName}`.trim(),
                  },
                  {
                    key: 'email',
                    header: 'Email',
                    render: (row) => row.email,
                  },
                  {
                    key: 'messages',
                    header: 'Messages',
                    render: (row) => row.messages.join('; ') || '—',
                  },
                ]}
              />
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function rowTone(row: ImportRow): string | undefined {
  if (row.status === 'failed') return 'bg-danger/15';
  if (row.status === 'skipped') return 'bg-amber-100 dark:bg-amber-950/40';
  return undefined;
}

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof ApiError || cause instanceof Error
    ? cause.message
    : fallback;
}

function downloadFeedback(report: ImportReport) {
  const blob = feedbackWorkbook(report.rows);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'employee-import-feedback.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}
