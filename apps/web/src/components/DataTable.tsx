import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  caption,
  emptyMessage,
  rowKey,
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  emptyMessage: string;
  rowKey?: (row: T) => string;
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  const keyFor = rowKey ?? ((row: T) => (row as { id: string }).id);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse bg-surface">
        <caption className="px-1 py-1 text-left font-semibold">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="whitespace-nowrap border-b border-line px-2 py-2 text-left"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFor(row)}>
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
