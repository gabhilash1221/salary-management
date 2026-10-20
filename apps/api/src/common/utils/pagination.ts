export function resolvePagination(
  page = 1,
  pageSize = 25,
): { page: number; pageSize: number; skip: number } {
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}
