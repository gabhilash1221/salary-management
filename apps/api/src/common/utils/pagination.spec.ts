import { resolvePagination } from './pagination';

describe('resolvePagination', () => {
  it('defaults to page 1 and 25 rows', () => {
    expect(resolvePagination()).toEqual({ page: 1, pageSize: 25, skip: 0 });
  });

  it('skips completed pages', () => {
    expect(resolvePagination(3, 50)).toEqual({
      page: 3,
      pageSize: 50,
      skip: 100,
    });
  });
});
