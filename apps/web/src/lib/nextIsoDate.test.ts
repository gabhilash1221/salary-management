import { describe, expect, it } from 'vitest';
import { earliestSalaryDate, nextIsoDate } from './nextIsoDate';

describe('earliestSalaryDate', () => {
  it('uses the day after the latest salary record', () => {
    expect(nextIsoDate('2026-10-20')).toBe('2026-10-21');
    expect(earliestSalaryDate('2022-06-03', '2026-10-20')).toBe('2026-10-21');
  });

  it('allows the hire date when the employee has no salary record', () => {
    expect(earliestSalaryDate('2022-06-03', null)).toBe('2022-06-03');
  });
});
