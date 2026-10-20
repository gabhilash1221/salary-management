import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePaginationState } from './usePaginationState';

describe('usePaginationState', () => {
  it('returns to the first page when the page size changes', () => {
    const { result } = renderHook(() => usePaginationState());
    act(() => result.current.setPage(4));
    act(() => result.current.setPageSize(50));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);
  });
});
