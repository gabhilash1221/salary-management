import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError, apiDownload, apiUpload } from '../../api/client';
import type { ImportReport, ImportRow } from '../../api/types';
import { Button } from '../../components/Button';
import { DataTable } from '../../components/DataTable';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import type { MessageKey } from '../../i18n/catalog';
import { useI18n } from '../../i18n/locale-context';
import { feedbackWorkbook } from './feedback-workbook';

const MAX_BYTES = 2 * 1024 * 1024;

export function EmployeeImport({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeModalRef = useRef<HTMLButtonElement>(null);
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
      setError(messageOf(cause, t('import.downloadError')));
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
      setError(messageOf(cause, t('import.previewError')));
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
      setError(messageOf(cause, t('import.confirmError')));
    } finally {
      setBusy(false);
    }
  }

  function selectedFile(): File | null {
    if (!file) {
      setError(t('import.choose'));
      return null;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setError(t('import.type'));
      return null;
    }
    if (file.size > MAX_BYTES) {
      setError(t('import.size'));
      return null;
    }
    return file;
  }

  useEffect(() => {
    if (!open) return;
    closeModalRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !summaryOpen) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, summaryOpen]);

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
    <>
      <Button onClick={() => setOpen(true)}>{t('import.button')}</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-import-title"
            className="grid max-h-[90vh] w-full max-w-3xl gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-4 text-ink shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="bulk-import-title" className="text-xl">
                {t('import.title')}
              </h2>
              <button
                ref={closeModalRef}
                type="button"
                aria-label={t('common.close')}
                className="cursor-pointer rounded-md px-2 py-1 text-2xl leading-none text-ink"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <p>{t('import.help')}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void downloadTemplate('xlsx')}>
                {t('import.excel')}
              </Button>
              <Button onClick={() => void downloadTemplate('csv')}>
                {t('import.csv')}
              </Button>
            </div>
            <Field label={t('import.file')} htmlFor="employee-import-file">
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
                {t('import.preview')}
              </Button>
              {report ? (
                <Button
                  disabled={busy || confirmed || report.valid === 0}
                  onClick={() => void confirm()}
                >
                  {t('import.confirm')}
                </Button>
              ) : null}
              {confirmed && report && !summaryOpen ? (
                <Button onClick={() => downloadFeedback(report)}>
                  {t('import.feedback')}
                </Button>
              ) : null}
            </div>
            {error ? <ErrorState message={error} /> : null}
            {report && !confirmed ? (
              <p role="status">
                {t('import.previewStatus', {
                  total: report.total,
                  valid: report.valid,
                  failed: report.failed,
                  skipped: report.skipped,
                })}
              </p>
            ) : null}
            {report ? (
              <div className="max-h-96 overflow-auto">
                <DataTable
                  caption={t('import.caption')}
                  emptyMessage={t('import.empty')}
                  rows={report.rows}
                  rowKey={(row) => String(row.row)}
                  rowClassName={rowTone}
                  columns={[
                    {
                      key: 'row',
                      header: t('import.row'),
                      render: (row) => row.row,
                    },
                    {
                      key: 'status',
                      header: t('employees.status'),
                      render: (row) => importStatus(t, row.status),
                    },
                    {
                      key: 'employee',
                      header: t('import.employee'),
                      render: (row) =>
                        `${row.employeeId} ${row.firstName} ${row.lastName}`.trim(),
                    },
                    {
                      key: 'email',
                      header: t('common.email'),
                      render: (row) => row.email,
                    },
                    {
                      key: 'messages',
                      header: t('import.messages'),
                      render: (row) => row.messages.join('; ') || '—',
                    },
                  ]}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {summaryOpen && report ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-result-title"
            className="w-full max-w-md rounded-lg border border-line bg-surface p-4 text-ink shadow-lg"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="import-result-title" className="text-xl">
                {t('import.complete')}
              </h2>
              <button
                ref={closeSummaryRef}
                type="button"
                aria-label={t('common.close')}
                className="cursor-pointer rounded-md px-2 py-1 text-2xl leading-none text-ink"
                onClick={() => setSummaryOpen(false)}
              >
                ×
              </button>
            </div>
            <p>
              {t('import.summary', {
                total: report.total,
                imported: report.imported,
                failed: notImported,
              })}
            </p>
            <div className="mt-4">
              <Button onClick={() => downloadFeedback(report)}>
                {t('import.feedback')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function rowTone(row: ImportRow): string | undefined {
  if (row.status === 'failed') return 'bg-danger/15';
  if (row.status === 'skipped') return 'bg-amber-100 dark:bg-amber-950/40';
  return undefined;
}

function importStatus(
  t: (key: MessageKey) => string,
  status: ImportRow['status'],
): string {
  if (status === 'ready') return t('import.ready');
  if (status === 'failed') return t('import.failed');
  if (status === 'skipped') return t('import.skipped');
  return t('import.imported');
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
