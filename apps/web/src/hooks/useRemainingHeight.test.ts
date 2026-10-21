import { describe, expect, it } from 'vitest';
import { remainingViewportHeight } from './useRemainingHeight';

describe('remainingViewportHeight', () => {
  it('uses the space from the table top to the bottom padding', () => {
    expect(remainingViewportHeight(240, 800, 20)).toBe(540);
  });

  it('keeps a usable scroll area when little space remains', () => {
    expect(remainingViewportHeight(760, 800, 20)).toBe(160);
  });
});
