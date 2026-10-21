import { type ReactNode, useRef } from 'react';
import { useRemainingHeight } from '../hooks/useRemainingHeight';
import { useI18n } from '../i18n/locale-context';
import { EmptyState } from './EmptyState';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortKey?: string;
};

export function DataTable<T>({
  rows,
  columns,
  caption,
  emptyMessage,
  rowKey,
  rowClassName,
  sort,
  fillRemaining = false,
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  emptyMessage: string;
  rowKey?: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;
  sort?: {
    key: string;
    order: 'asc' | 'desc';
    onChange: (key: string) => void;
  };
  fillRemaining?: boolean;
}) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLTableCaptionElement>(null);
  const { maxHeight, headerOffset } = useRemainingHeight(
    frameRef,
    captionRef,
    fillRemaining && rows.length > 0,
  );
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  const keyFor = rowKey ?? ((row: T) => (row as { id: string }).id);
  return (
    <div
      ref={frameRef}
      className="overflow-auto"
      style={maxHeight === undefined ? undefined : { maxHeight }}
    >
      <table
        className={`w-full min-w-[40rem] bg-surface ${
          fillRemaining ? 'border-separate border-spacing-0' : 'border-collapse'
        }`}
      >
        <caption
          ref={captionRef}
          className={`px-1 py-1 text-left font-semibold ${
            fillRemaining ? 'sticky top-0 z-20 bg-canvas' : ''
          }`}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort && column.sortKey === sort.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    column.sortKey
                      ? active
                        ? sort.order === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  className={`whitespace-nowrap border-b border-line px-2 py-2 text-left ${
                    fillRemaining ? 'sticky z-10 bg-surface' : ''
                  }`}
                  style={fillRemaining ? { top: headerOffset } : undefined}
                >
                  {sort && column.sortKey ? (
                    <button
                      type="button"
                      className="cursor-pointer underline decoration-dotted underline-offset-2"
                      aria-label={t('table.sortBy', { column: column.header })}
                      onClick={() => sort.onChange(column.sortKey ?? '')}
                    >
                      {column.header}
                      {active ? (sort.order === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFor(row)} className={rowClassName?.(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="border-b border-line px-2 py-2 text-left align-top"
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
