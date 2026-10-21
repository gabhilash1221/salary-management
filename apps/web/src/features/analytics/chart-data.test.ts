import { describe, expect, it } from 'vitest';
import type { DistributionRow, SummaryRow } from '../../api/types';
import { distributionItems, headcountItems, medianItems } from './chart-data';

const rows: SummaryRow[] = [
  {
    currency: 'USD',
    department: 'Sales',
    count: 4,
    suppressed: true,
  },
  {
    currency: 'USD',
    department: 'Engineering',
    count: 12,
    suppressed: false,
    median: 9_000_000,
  },
];

describe('analytics chart data', () => {
  it('ranks medians and labels suppressed groups', () => {
    const items = medianItems(rows, (amount) => String(amount));
    expect(items.map((item) => item.label)).toEqual(['Engineering', 'Sales']);
    expect(items[1]?.display).toBe('Suppressed');
  });

  it('ranks headcount from largest to smallest', () => {
    expect(headcountItems(rows).map((item) => item.value)).toEqual([12, 4]);
  });

  it('drops empty buckets at the ends of a distribution', () => {
    const buckets: DistributionRow[] = [
      { currency: 'USD', minMinor: 0, maxMinor: 100, count: 0 },
      { currency: 'USD', minMinor: 100, maxMinor: 200, count: 3 },
      { currency: 'USD', minMinor: 200, maxMinor: 300, count: 0 },
    ];
    expect(distributionItems(buckets, (amount) => String(amount))).toEqual([
      {
        key: '100',
        label: '100',
        value: 3,
        display: '100–200: 3',
      },
    ]);
  });
});
