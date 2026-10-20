import { describe, expect, it } from 'vitest';
import { pageWindow } from './page-window';

describe('pageWindow', () => {
  it('shows the current page with neighbors and both ends', () => {
    expect(pageWindow(5, 10)).toEqual([
      1,
      'ellipsis',
      3,
      4,
      5,
      6,
      7,
      'ellipsis',
      10,
    ]);
  });

  it('lists every page when the list is short', () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the first pages together when the current page is near the start', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 'ellipsis', 10]);
  });
});
