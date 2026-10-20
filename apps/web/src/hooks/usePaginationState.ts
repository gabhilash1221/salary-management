import { useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function usePaginationState(initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  function setPageSize(next: number) {
    setPageSizeState(next);
    setPage(1);
  }

  return { page, pageSize, setPage, setPageSize };
}
