import { describe, expect, it } from 'vitest';
import { formatMoney } from './formatMoney';

describe('formatMoney', () => {
  it('formats minor units as major currency', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56');
  });
});
