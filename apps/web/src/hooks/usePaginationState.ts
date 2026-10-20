import { useState } from 'react';

export function usePaginationState(initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  return { page, pageSize, setPage };
}
