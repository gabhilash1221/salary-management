import { PAGE_SIZE_OPTIONS } from '../hooks/usePaginationState';
import { controlClass } from './Field';
import { pageWindow } from './page-window';

const pageButtonClass =
  'inline-flex h-8 min-w-8 items-center justify-center rounded border border-line bg-surface px-1.5 text-muted disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted aria-[current=page]:border-brand aria-[current=page]:font-semibold aria-[current=page]:text-ink';

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const items = pageWindow(page, pageCount);

  return (
    <nav
      className="my-3 flex w-full flex-col items-end gap-3 sm:flex-row sm:flex-wrap sm:justify-end"
      aria-label="Pagination"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={pageButtonClass}
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`gap-${String(items[index + 1])}`}
              className="min-w-5 text-center text-muted"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={pageButtonClass}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={pageButtonClass}
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
      </div>
      {onPageSizeChange ? (
        <label className="flex w-fit flex-row items-center gap-2 text-sm text-muted">
          Per page
          <select
            className={`${controlClass} h-8 w-auto`}
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </nav>
  );
}
