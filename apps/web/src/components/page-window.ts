export type PageItem = number | 'ellipsis';

const SIBLING_COUNT = 2;

export function pageWindow(page: number, pageCount: number): PageItem[] {
  const current = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const last = Math.max(pageCount, 1);
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, index) => start + index);

  if (last <= SIBLING_COUNT * 2 + 3) {
    return range(1, last);
  }

  const left = Math.max(current - SIBLING_COUNT, 1);
  const right = Math.min(current + SIBLING_COUNT, last);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < last - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, SIBLING_COUNT * 2 + 3), 'ellipsis', last];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, 'ellipsis', ...range(last - (SIBLING_COUNT * 2 + 2), last)];
  }
  return [1, 'ellipsis', ...range(left, right), 'ellipsis', last];
}
